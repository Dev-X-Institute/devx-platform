from __future__ import annotations

import os

from devx_ai_worker.providers.base import AIProvider
from devx_ai_worker.providers.mock import MockProvider


def create_provider() -> AIProvider:
    provider_name = os.getenv("AI_PROVIDER", "mock").strip().lower()
    if provider_name == "mock":
        return MockProvider()
    raise RuntimeError(f"Unsupported AI_PROVIDER: {provider_name}")
