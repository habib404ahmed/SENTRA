from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class PcapImportModel(Base):
    __tablename__ = "pcap_imports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    server_id = Column(Integer, ForeignKey("monitored_servers.id", ondelete="SET NULL"), nullable=True, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    status = Column(String(50), nullable=False, default="queued", index=True)  # queued, processing, completed, failed
    total_packets = Column(Integer, nullable=False, default=0)
    total_flows = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    processing_completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    server = relationship("MonitoredServerModel", backref="pcap_imports", lazy="joined")
    flows = relationship("TrafficFlowModel", back_populates="pcap_import", cascade="all, delete-orphan", passive_deletes=True)

    def __repr__(self):
        return f"<PcapImport(id={self.id}, file='{self.original_filename}', status='{self.status}')>"
