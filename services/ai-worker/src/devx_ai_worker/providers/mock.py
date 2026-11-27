from __future__ import annotations

import json

from devx_ai_worker.contracts import ProviderRequest


class MockProvider:
    """Deterministic provider for local workflow and integration scaffolding."""

    async def complete(self, request: ProviderRequest) -> str:
        if request.app_id == "education-web" and request.feature_key == "lesson.explain":
            question = request.context.get("question", "the question")
            return f"Mock explanation for: {question}"
        if request.app_id == "education-web" and request.feature_key == "quiz.generate":
            count = request.context.get("count", 1)
            return json.dumps({
                "questions": [
                    {
                        "question": f"Mock question {index + 1} based on the lesson",
                        "options": ["Option A", "Option B", "Option C", "Option D"],
                        "answerIndex": index % 4,
                    }
                    for index in range(count)
                ]
            })
        return f"Mock result for {request.app_id}/{request.feature_key}"
