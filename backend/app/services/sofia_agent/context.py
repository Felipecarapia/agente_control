import contextvars
from database.models import Tenant

# Context Variable to store the current tenant in the execution thread
current_tenant: contextvars.ContextVar[Tenant] = contextvars.ContextVar("current_tenant")
