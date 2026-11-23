from __future__ import annotations

from devx_ai_worker.contracts import ProviderRequest


class MockProvider:
    """Deterministic provider for local workflow and integration scaffolding."""

    async def complete(self, request: ProviderRequest) -> str:
        if request.app_id == "education-web" and request.feature_key == "lesson.explain":
            question = request.context.get("question", "the question")
            return f"Mock explanation for: {question}"
        return f"Mock result for {request.app_id}/{request.feature_key}"
