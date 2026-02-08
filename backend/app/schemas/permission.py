from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PermissionBase(BaseModel):
    module: str
    action: str
    name: str
    description: Optional[str] = None


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class RolePermissionResponse(BaseModel):
    permission_id: int
    permission: PermissionResponse

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    key: str
    name: str


class RoleUpdate(BaseModel):
    name: Optional[str] = None


class RoleResponse(BaseModel):
    id: int
    key: str
    name: str
    created_at: datetime
    permissions: list[PermissionResponse] = []

    class Config:
        from_attributes = True


class RoleWithPermissionsResponse(RoleResponse):
    permissions: list[PermissionResponse] = []

    class Config:
        from_attributes = True


class UpdateRolePermissionsRequest(BaseModel):
    permission_ids: list[int]




