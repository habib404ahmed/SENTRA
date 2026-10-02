from sqlalchemy import Column, Integer, BigInteger, Float, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database import Base


class TrafficFlowModel(Base):
    __tablename__ = "traffic_flows"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    import_id = Column(Integer, ForeignKey("pcap_imports.id", ondelete="CASCADE"), nullable=False, index=True)
    server_id = Column(Integer, ForeignKey("monitored_servers.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # 5-tuple directional flow identification (Forward-only; reverse channel is NOT merged)
    source_ip = Column(String(64), nullable=False, index=True)
    destination_ip = Column(String(64), nullable=False, index=True)
    source_port = Column(Integer, nullable=True, index=True)
    destination_port = Column(Integer, nullable=True, index=True)
    protocol = Column(String(20), nullable=False, index=True)

    # Temporal & volume metadata
    start_time = Column(DateTime(timezone=True), nullable=True, index=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Float, nullable=False, default=0.0)  # Seconds
    packet_count = Column(Integer, nullable=False, default=0)
    byte_count = Column(BigInteger, nullable=False, default=0)
    average_packet_size = Column(Float, nullable=False, default=0.0)
    packets_per_second = Column(Float, nullable=False, default=0.0)
    bytes_per_second = Column(Float, nullable=False, default=0.0)
    average_interarrival_time = Column(Float, nullable=False, default=0.0)  # Seconds

    # TCP control flags (0 for non-TCP protocols)
    tcp_syn_count = Column(Integer, nullable=False, default=0)
    tcp_ack_count = Column(Integer, nullable=False, default=0)
    tcp_fin_count = Column(Integer, nullable=False, default=0)
    tcp_rst_count = Column(Integer, nullable=False, default=0)

    # Relationships
    pcap_import = relationship("PcapImportModel", back_populates="flows")
    server = relationship("MonitoredServerModel", backref="traffic_flows", lazy="joined")

    __table_args__ = (
        Index("ix_traffic_flows_endpoints", "source_ip", "destination_ip"),
        Index("ix_traffic_flows_ports", "source_port", "destination_port"),
        Index("ix_traffic_flows_protocol_import", "import_id", "protocol"),
    )

    def __repr__(self):
        return f"<TrafficFlow(id={self.id}, {self.source_ip}:{self.source_port} -> {self.destination_ip}:{self.destination_port} [{self.protocol}])>"
