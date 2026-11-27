from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

from llama_index.core.workflow import Workflow
from psycopg import AsyncConnection
from psycopg.types.json import Jsonb

from devx_ai_worker.workflow import AiTaskWorkflow


logger = logging.getLogger("devx_ai_worker")
VISIBILITY_TIMEOUT_SECONDS = 300
POLL_INTERVAL_SECONDS = 2


class EducationTaskWorker:
    """PGMQ consumer for task IDs; database rows remain the source of truth."""

    def __init__(self, database_url: str, workflow: Workflow | None = None) -> None:
        self._database_url = database_url
        self._workflow = workflow or AiTaskWorkflow(timeout=90, verbose=False)

    async def run_forever(self) -> None:
        while True:
            try:
                processed = await self.process_one()
            except Exception as error:
                logger.error(
                    "worker_poll_failed",
                    extra={"error_type": type(error).__name__},
                )
                processed = False
            if not processed:
                await asyncio.sleep(POLL_INTERVAL_SECONDS)

    async def process_one(self) -> bool:
        async with await AsyncConnection.connect(
            self._database_url, autocommit=True
        ) as connection:
            claimed = await self._claim_one(connection)
            if claimed is None:
                return False

            message_id, task = claimed
            task_id = task["task_id"]
            try:
                lesson = await self._authorize_and_load_lesson(connection, task)
                task["authorized_context"] = {"lesson_text": lesson["content"]}
                result_envelope = await self._workflow.run(task=task)
                result = result_envelope.get("result")
                if not isinstance(result, dict):
                    raise ValueError("Worker returned an invalid result")
                status = "needs_review" if task["feature_key"] == "quiz.generate" else "succeeded"
                await self._complete(connection, message_id, task_id, result, status)
            except TaskRejected as error:
                await self._fail_terminal(
                    connection, message_id, task_id, error.failure_code
                )
            except ValueError:
                await self._fail_terminal(
                    connection, message_id, task_id, "AI_INVALID_RESPONSE"
                )
            except Exception as error:
                logger.error(
                    "task_processing_failed",
                    extra={"task_id": task_id, "error_type": type(error).__name__},
                )
                await self._retry_or_fail(connection, message_id, task)
        return True

    async def _claim_one(
        self, connection: AsyncConnection[Any]
    ) -> tuple[int, dict[str, Any]] | None:
        async with connection.transaction():
            cursor = await connection.execute(
                "select msg_id, message from pgmq.read(%s, %s, %s)",
                ("ai_tasks", VISIBILITY_TIMEOUT_SECONDS, 1),
            )
            message_row = await cursor.fetchone()
            if message_row is None:
                return None
            message_id, message = message_row
            if not isinstance(message, dict) or not isinstance(message.get("task_id"), str):
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )
                return None

            task_id = message["task_id"]
            cursor = await connection.execute(
                """
                select id, request_id, created_by, app_id, feature_key, schema_version,
                       status, attempt_count, max_attempts, deadline_at, started_at, source_refs
                from public.ai_tasks
                where id = %s
                for update
                """,
                (task_id,),
            )
            row = await cursor.fetchone()
            if row is None:
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )
                return None
            task = dict(zip(
                ("task_id", "request_id", "created_by", "app_id", "feature_key",
                 "schema_version", "status", "attempt_count", "max_attempts",
                 "deadline_at", "started_at", "source_refs"),
                row,
                strict=True,
            ))

            if task["status"] in ("succeeded", "failed", "cancelled", "needs_review"):
                await self._delete_input(connection, task_id)
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )
                return None
            if task["status"] == "running" and task["started_at"] is not None:
                lease_expired_at = task["started_at"].timestamp() + VISIBILITY_TIMEOUT_SECONDS
                if lease_expired_at > datetime.now(timezone.utc).timestamp():
                    return None
            elif task["status"] != "queued":
                await connection.execute(
                    "update public.ai_tasks set status = 'failed', failure_code = %s, finished_at = now() where id = %s",
                    ("AI_TASK_STATE_INVALID", task_id),
                )
                await self._delete_input(connection, task_id)
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )
                return None
            if task["attempt_count"] >= task["max_attempts"]:
                await connection.execute(
                    "update public.ai_tasks set status = 'failed', failure_code = %s, finished_at = now() where id = %s",
                    ("AI_TASK_ATTEMPTS_EXHAUSTED", task_id),
                )
                await self._delete_input(connection, task_id)
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )
                return None
            if task["deadline_at"] is not None and task["deadline_at"] <= datetime.now(timezone.utc):
                await connection.execute(
                    "update public.ai_tasks set status = 'failed', failure_code = %s, finished_at = now() where id = %s",
                    ("AI_TASK_DEADLINE_EXCEEDED", task_id),
                )
                await self._delete_input(connection, task_id)
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )
                return None

            cursor = await connection.execute(
                "select payload, expires_at from private.education_ai_task_inputs where task_id = %s",
                (task_id,),
            )
            input_row = await cursor.fetchone()
            if input_row is None or input_row[1] <= datetime.now(timezone.utc):
                await connection.execute(
                    "update public.ai_tasks set status = 'failed', failure_code = %s, finished_at = now() where id = %s",
                    ("AI_TASK_INPUT_EXPIRED", task_id),
                )
                await self._delete_input(connection, task_id)
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )
                return None
            payload = input_row[0]
            if not isinstance(payload, dict):
                raise ValueError("Task input must be an object")
            task["payload"] = payload
            task["attempt_count"] += 1
            await connection.execute(
                """
                update public.ai_tasks
                set status = 'running', attempt_count = %s, started_at = now(), failure_code = null
                where id = %s
                """,
                (task["attempt_count"], task_id),
            )
            return int(message_id), task

    async def _authorize_and_load_lesson(
        self, connection: AsyncConnection[Any], task: dict[str, Any]
    ) -> dict[str, Any]:
        lesson_id = task["payload"].get("lesson_id")
        if not isinstance(lesson_id, str):
            raise TaskRejected("AI_TASK_INPUT_INVALID")
        cursor = await connection.execute(
            """
            select l.id, l.school_id, l.course_id, l.content, l.revision,
                   sm.role::text as school_role, cm.role::text as course_role
            from public.lessons l
            join public.school_memberships sm
              on sm.school_id = l.school_id
             and sm.user_id = %s
             and sm.status = 'active'
            left join public.course_memberships cm
              on cm.school_id = l.school_id
             and cm.course_id = l.course_id
             and cm.user_id = %s
             and cm.status = 'active'
            where l.id = %s
            """,
            (task["created_by"], task["created_by"], lesson_id),
        )
        row = await cursor.fetchone()
        if row is None:
            raise TaskRejected("AI_SOURCE_NOT_FOUND")
        lesson = dict(zip(
            ("id", "school_id", "course_id", "content", "revision", "school_role", "course_role"),
            row,
            strict=True,
        ))
        school_role = lesson["school_role"]
        course_role = lesson["course_role"]
        allowed = (
            school_role == "admin"
            or (school_role == "teacher" and course_role == "teacher")
            or (
                task["feature_key"] == "lesson.explain"
                and school_role == "student"
                and course_role == "student"
            )
        )
        if not allowed:
            raise TaskRejected("AI_ACCESS_DENIED")
        await connection.execute(
            "update public.ai_tasks set school_id = %s, source_refs = %s where id = %s",
            (lesson["school_id"], Jsonb({"lesson_id": lesson["id"], "lesson_revision": lesson["revision"]}), task["task_id"]),
        )
        return lesson

    async def _complete(
        self,
        connection: AsyncConnection[Any],
        message_id: int,
        task_id: str,
        result: dict[str, Any],
        status: str,
    ) -> None:
        async with connection.transaction():
            await connection.execute(
                """
                insert into public.education_ai_task_results (task_id, result)
                values (%s, %s)
                on conflict (task_id) do update set result = excluded.result, created_at = now()
                """,
                (task_id, Jsonb(result)),
            )
            await connection.execute(
                """
                update public.ai_tasks
                set status = %s, result_refs = %s, finished_at = now(), failure_code = null
                where id = %s
                """,
                (status, Jsonb({"task_id": task_id}), task_id),
            )
            await self._delete_input(connection, task_id)
            await connection.execute(
                "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
            )

    async def _fail_terminal(
        self, connection: AsyncConnection[Any], message_id: int, task_id: str, code: str
    ) -> None:
        async with connection.transaction():
            await connection.execute(
                """
                update public.ai_tasks
                set status = 'failed', failure_code = %s, finished_at = now()
                where id = %s and status not in ('succeeded', 'failed', 'cancelled', 'needs_review')
                """,
                (code, task_id),
            )
            await self._delete_input(connection, task_id)
            await connection.execute(
                "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
            )

    async def _retry_or_fail(
        self, connection: AsyncConnection[Any], message_id: int, task: dict[str, Any]
    ) -> None:
        terminal = task["attempt_count"] >= task["max_attempts"]
        async with connection.transaction():
            await connection.execute(
                """
                update public.ai_tasks
                set status = %s, failure_code = %s,
                    started_at = null, finished_at = case when %s then now() else null end
                where id = %s
                """,
                (
                    "failed" if terminal else "queued",
                    "AI_WORKER_RETRY_EXHAUSTED" if terminal else "AI_WORKER_RETRYABLE",
                    terminal,
                    task["task_id"],
                ),
            )
            if terminal:
                await self._delete_input(connection, task["task_id"])
                await connection.execute(
                    "select pgmq.archive(%s, %s)", ("ai_tasks", message_id)
                )

    @staticmethod
    async def _delete_input(connection: AsyncConnection[Any], task_id: str) -> None:
        await connection.execute(
            "delete from private.education_ai_task_inputs where task_id = %s",
            (task_id,),
        )


class TaskRejected(Exception):
    def __init__(self, failure_code: str) -> None:
        self.failure_code = failure_code
        super().__init__(failure_code)


async def run_worker() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL must be set for the AI worker")
    await EducationTaskWorker(database_url).run_forever()


def main() -> None:
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    asyncio.run(run_worker())
