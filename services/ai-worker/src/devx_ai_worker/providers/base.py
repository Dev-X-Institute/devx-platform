from __future__ import annotations

from typing import Protocol

from devx_ai_worker.contracts import ProviderRequest


class AIProvider(Protocol):
    async def complete(self, request: ProviderRequest) -> str:
        """Generate a response without owning app-specific authorization."""
        ...
