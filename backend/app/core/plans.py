from typing import Dict, Set

from app.models.tenant import PlanType


PLAN_FEATURES: Dict[str, Set[str]] = {
    PlanType.BASIC.value: {
        "crm_core",
        "whatsapp_automation",
    },
    PlanType.PRO.value: {
        "crm_core",
        "whatsapp_automation",
        "ai_agents",
        "campaigns",
    },
    PlanType.ENTERPRISE.value: {
        "crm_core",
        "whatsapp_automation",
        "ai_agents",
        "campaigns",
        "advanced_analytics",
        "tenant_admin_advanced",
    },
}

PLAN_LIMITS: Dict[str, dict] = {
    PlanType.BASIC.value: {
        "whatsapp_connections": 1,
        "ai_agents": 1,
        "campaigns_active": 1,
    },
    PlanType.PRO.value: {
        "whatsapp_connections": 5,
        "ai_agents": 10,
        "campaigns_active": 10,
    },
    PlanType.ENTERPRISE.value: {
        "whatsapp_connections": 9999,
        "ai_agents": 9999,
        "campaigns_active": 9999,
    },
}

