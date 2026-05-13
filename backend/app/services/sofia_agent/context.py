import contextvars
from typing import Any

# Context Variables to store the current tenant and agent in the execution thread
current_tenant: contextvars.ContextVar[Any] = contextvars.ContextVar("current_tenant")
current_agent: contextvars.ContextVar[Any] = contextvars.ContextVar("current_agent")
