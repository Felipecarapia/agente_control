import uuid
from typing import Any, Optional, List
from datetime import datetime
from pydantic import BaseModel


class CampaignBase(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "prospecting"  # "prospecting" | "whatsapp_blast" | "email" | "custom"
    config_json: Optional[Any] = None  # {city, activity, radius_km, max_results, ...}
    agent_id: Optional[uuid.UUID] = None
    whatsapp_connection_id: Optional[uuid.UUID] = None


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    config_json: Optional[Any] = None
    agent_id: Optional[uuid.UUID] = None
    whatsapp_connection_id: Optional[uuid.UUID] = None


class CampaignLeadResponse(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    business_name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    category: Optional[str] = None
    rating: Optional[float] = None
    source: str
    status: str
    metadata_json: Optional[Any] = None
    found_at: Optional[datetime] = None
    contacted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CampaignResponse(CampaignBase):
    id: uuid.UUID
    status: str = "draft"
    total_leads_found: int = 0
    created_by_user_id: Optional[uuid.UUID] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CampaignWithLeadsResponse(CampaignResponse):
    leads: List[CampaignLeadResponse] = []


class CampaignSearchConfig(BaseModel):
    city: str
    activity: str
    state: Optional[str] = None
    radius_km: Optional[int] = 50
    max_results: Optional[int] = 50


class ProspectingResultResponse(BaseModel):
    campaign_id: uuid.UUID
    total_found: int
    new_leads: int
    message: str
