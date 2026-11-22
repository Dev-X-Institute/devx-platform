from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Protocol


@dataclass(frozen=True, slots=True)
class TaskEnvelope:
    """Trusted task data loaded by the worker, not a browser-supplied event."""

    task_id: str
    app_id: str
    feature_key: str
    payload: dict[str, Any]
    schema_version: str = "v1"

    @classmethod
    def from_mapping(cls, value: Mapping[str, Any]) -> TaskEnvelope:
        required_strings = ("task_id", "app_id", "feature_key")
        if any(not isinstance(value.get(key), str) or not value[key] for key in required_strings):
            raise ValueError("Task is missing a valid identity or feature key")
        payload = value.get("payload")
        if not isinstance(payload, dict):
            raise ValueError("Task payload must be an object")
        schema_version = value.get("schema_version", "v1")
        if not isinstance(schema_version, str) or not schema_version:
            raise ValueError("Task schema_version must be a non-empty string")
        return cls(
            task_id=value["task_id"],
            app_id=value["app_id"],
            feature_key=value["feature_key"],
            payload=payload,
            schema_version=schema_version,
        )


@dataclass(frozen=True, slots=True)
class ProviderRequest:
    """Minimal, feature-prepared input passed to a provider adapter."""

    app_id: str
    feature_key: str
    system_prompt: str
    user_prompt: str
    context: Mapping[str, Any]


class TaskQueue(Protocol):
    """Queue adapter seam. Production implementations should claim task IDs only."""

    async def receive(self) -> str | None:
        ...

    async def acknowledge(self, message_id: str) -> None:
        ...
