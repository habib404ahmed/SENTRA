import ipaddress
from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# Allowed Status Values
ServerStatusType = Literal["active", "paused"]

# Allowed Traffic Sources
VALID_TRAFFIC_SOURCES = {
    "PCAP",
    "NetFlow",
    "IPFIX",
    "Mirrored Traffic",
    "Other Authorized Flow Source",
    "Optical Diode Tap",
    "Flow Telemetry",
}

# Allowed Environments
VALID_ENVIRONMENTS = {
    "production",
    "staging",
    "development",
    "dmz",
    "Demo",
    "demo",
}


class ServerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Server or asset display name")
    hostname: str = Field(..., min_length=1, max_length=255, description="Network hostname or FQDN")
    ip_address: str = Field(..., max_length=64, description="IPv4 or IPv6 address")
    server_type: str = Field(..., min_length=1, max_length=100, description="Server archetype / role")
    environment: str = Field(..., description="Deployment environment (production, staging, development, dmz, Demo)")
    traffic_source: str = Field(..., description="Telemetry source mechanism")
    status: ServerStatusType = Field(default="active", description="Monitoring status: active or paused")
    description: Optional[str] = Field(default="", max_length=1000, description="Asset description / notes")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Server name cannot be blank")
        return trimmed

    @field_validator("hostname")
    @classmethod
    def validate_hostname(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Hostname cannot be blank")
        return trimmed

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("IP address cannot be blank")
        try:
            ipaddress.ip_address(trimmed)
        except ValueError:
            raise ValueError(f"Invalid IP address format: '{trimmed}'. Must be a valid IPv4 or IPv6 address.")
        return trimmed

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        trimmed = v.strip()
        if trimmed not in VALID_ENVIRONMENTS:
            raise ValueError(
                f"Invalid environment: '{trimmed}'. Must be one of: {', '.join(sorted(VALID_ENVIRONMENTS))}"
            )
        return trimmed

    @field_validator("traffic_source")
    @classmethod
    def validate_traffic_source(cls, v: str) -> str:
        trimmed = v.strip()
        if trimmed not in VALID_TRAFFIC_SOURCES:
            raise ValueError(
                f"Invalid traffic source: '{trimmed}'. Must be one of: {', '.join(sorted(VALID_TRAFFIC_SOURCES))}"
            )
        return trimmed


class ServerCreate(ServerBase):
    pass


class ServerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    hostname: Optional[str] = Field(None, min_length=1, max_length=255)
    ip_address: Optional[str] = Field(None, max_length=64)
    server_type: Optional[str] = Field(None, min_length=1, max_length=100)
    environment: Optional[str] = None
    traffic_source: Optional[str] = None
    status: Optional[ServerStatusType] = None
    description: Optional[str] = Field(None, max_length=1000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Server name cannot be blank")
            return trimmed
        return v

    @field_validator("hostname")
    @classmethod
    def validate_hostname(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Hostname cannot be blank")
            return trimmed
        return v

    @field_validator("ip_address")
    @classmethod
    def validate_ip_address(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            try:
                ipaddress.ip_address(trimmed)
            except ValueError:
                raise ValueError(f"Invalid IP address format: '{trimmed}'.")
            return trimmed
        return v

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if trimmed not in VALID_ENVIRONMENTS:
                raise ValueError(
                    f"Invalid environment: '{trimmed}'. Must be one of: {', '.join(sorted(VALID_ENVIRONMENTS))}"
                )
            return trimmed
        return v

    @field_validator("traffic_source")
    @classmethod
    def validate_traffic_source(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if trimmed not in VALID_TRAFFIC_SOURCES:
                raise ValueError(
                    f"Invalid traffic source: '{trimmed}'. Must be one of: {', '.join(sorted(VALID_TRAFFIC_SOURCES))}"
                )
            return trimmed
        return v


from pydantic import BaseModel, Field, field_validator, ConfigDict


class ServerResponse(ServerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

