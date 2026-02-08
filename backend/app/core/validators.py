"""
Validadores Pydantic para endpoints críticos.
"""
from typing import Optional
from pydantic import BaseModel, Field, validator
from datetime import date, datetime


class DateRangeValidator(BaseModel):
    """Validador para range de datas."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            if v < values['start_date']:
                raise ValueError('end_date deve ser maior ou igual a start_date')
        return v


class PaginationValidator(BaseModel):
    """Validador para paginação."""
    page: int = Field(default=1, ge=1, description="Número da página (>= 1)")
    page_size: int = Field(default=20, ge=1, le=100, description="Itens por página (1-100)")
    
    @validator('page')
    def validate_page(cls, v):
        if v < 1:
            raise ValueError('page deve ser >= 1')
        return v


class ValueRangeValidator(BaseModel):
    """Validador para range de valores."""
    min_value_cents: Optional[int] = Field(None, ge=0, description="Valor mínimo em centavos")
    max_value_cents: Optional[int] = Field(None, ge=0, description="Valor máximo em centavos")
    
    @validator('max_value_cents')
    def validate_value_range(cls, v, values):
        if v and 'min_value_cents' in values and values['min_value_cents']:
            if v < values['min_value_cents']:
                raise ValueError('max_value_cents deve ser maior ou igual a min_value_cents')
        return v


class IDValidator(BaseModel):
    """Validador para IDs."""
    id: int = Field(..., gt=0, description="ID deve ser maior que 0")




