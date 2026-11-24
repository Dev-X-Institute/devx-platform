from __future__ import annotations

import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from typing import Any

from devx_ai_worker.apps.education_web import HANDLERS
from devx_ai_worker.contracts import TaskEnvelope
from devx_ai_worker.providers.mock import MockProvider
from devx_ai_worker.worker import EducationTaskWorker


TASK_ID = "6a56eae8-6a24-4db3-a0bf-63bfabf28488"
USER_ID = "29c56410-dba0-4a7a-aa85-aa161a871479"
LESSON_ID = "d0176a76-35d6-4ee7-87d8-6bcac8a71bf6"
LESSON_TEXT = "A force is a push or pull that can change an object's motion."


class FakeCursor:
    def __init__(self, row: tuple[Any, ...] | None) -> None:
        self.row = row

    async def fetchone(self) -> tuple[Any, ...] | None:
        return self.row


class FakeTransaction:
    async def __aenter__(self) -> FakeTransaction:
        return self

    async def __aexit__(self, *_: object) -> None:
        return None


class FakeConnection:
    def __init__(self) -> None:
        self.statements: list[tuple[str, tuple[Any, ...] | None]] = []

    def transaction(self) -> FakeTransaction:
        return FakeTransaction()

    async def execute(self, query: str, params: tuple[Any, ...] | None = None) -> FakeCursor:
        self.statements.append((query, params))
        normalized = " ".join(query.split())
        if "from pgmq.read" in normalized:
            return FakeCursor((42, {"task_id": TASK_ID}))
        if "from public.ai_tasks" in normalized and "for update" in normalized:
            return FakeCursor((
                TASK_ID,
                "req-123",
                USER_ID,
                "education-web",
                "lesson.explain",
                "v1",
                "queued",
                0,
                3,
                None,
                None,
                {},
            ))
        if "from private.education_ai_task_inputs" in normalized:
            return FakeCursor(({"lesson_id": LESSON_ID, "question": "What is a force?"}, datetime.now(timezone.utc) + timedelta(hours=1)))
        return FakeCursor(None)


class EducationWorkerTests(unittest.TestCase):
    def test_worker_loads_task_identity_and_private_input_from_database(self) -> None:
        connection = FakeConnection()
        worker = EducationTaskWorker("postgresql://unused")

        task = asyncio.run(worker._claim_one(connection))

        self.assertIsNotNone(task)
        message_id, loaded = task  # type: ignore[misc]
        self.assertEqual(message_id, 42)
        self.assertEqual(loaded["task_id"], TASK_ID)
        self.assertEqual(loaded["created_by"], USER_ID)
        self.assertEqual(loaded["app_id"], "education-web")
        self.assertEqual(loaded["feature_key"], "lesson.explain")
        self.assertEqual(loaded["payload"], {"lesson_id": LESSON_ID, "question": "What is a force?"})
        self.assertEqual(loaded["attempt_count"], 1)
        queue_query = next(query for query, _ in connection.statements if "pgmq.read" in query)
        self.assertIn("select msg_id, message from pgmq.read", " ".join(queue_query.split()))

    def test_task_envelope_requires_trusted_identity_fields(self) -> None:
        task = TaskEnvelope.from_mapping({
            "task_id": TASK_ID,
            "created_by": USER_ID,
            "app_id": "education-web",
            "feature_key": "lesson.explain",
            "payload": {"question": "Why?"},
        })
        self.assertEqual(task.created_by, USER_ID)
        with self.assertRaises(ValueError):
            TaskEnvelope.from_mapping({"task_id": TASK_ID, "payload": {}})

    def test_mock_provider_generates_a_lesson_explanation(self) -> None:
        task = TaskEnvelope.from_mapping({
            "task_id": TASK_ID,
            "created_by": USER_ID,
            "app_id": "education-web",
            "feature_key": "lesson.explain",
            "payload": {"question": "What is a force?"},
            "authorized_context": {"lesson_text": LESSON_TEXT},
        })
        handler = HANDLERS[(task.app_id, task.feature_key)]
        request = handler.prepare(task)
        response = asyncio.run(MockProvider().complete(request))
        result = handler.parse_result(response, task)
        self.assertEqual(result, {"answer": "Mock explanation for: What is a force?"})

    def test_mock_provider_drafts_a_valid_quiz_for_teacher_review(self) -> None:
        task = TaskEnvelope.from_mapping({
            "task_id": TASK_ID,
            "created_by": USER_ID,
            "app_id": "education-web",
            "feature_key": "quiz.generate",
            "payload": {"count": 2},
            "authorized_context": {"lesson_text": LESSON_TEXT},
        })
        handler = HANDLERS[(task.app_id, task.feature_key)]
        request = handler.prepare(task)
        response = asyncio.run(MockProvider().complete(request))
        result = handler.parse_result(response, task)
        self.assertEqual(len(result["questions"]), 2)
        self.assertTrue(result["reviewRequired"])
        self.assertTrue(all(len(question["options"]) == 4 for question in result["questions"]))


if __name__ == "__main__":
    unittest.main()
