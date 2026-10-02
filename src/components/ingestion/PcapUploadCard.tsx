import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { serversApi } from '@/services/servers';
import { ingestionApi } from '@/services/ingestion';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Select';
import { MonitoredServer, PcapImport } from '@/types';
import { 
  UploadCloud, 
  FileCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Server, 
  Info,
  ShieldAlert
} from 'lucide-react';

interface PcapUploadCardProps {
  onUploadSuccess: (imported: PcapImport) => void;
}

export const PcapUploadCard: React.FC<PcapUploadCardProps> = ({ onUploadSuccess }) => {
  const { showToast } = useApp();
  const [servers, setServers] = useState<MonitoredServer[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load available servers for selection
    serversApi.getAll().then(setServers).catch(() => {});
  }, []);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pcap', 'pcapng', 'cap'].includes(ext)) {
      return `Unsupported file format (.${ext}). Only .pcap, .pcapng, and .cap capture files are supported.`;
    }
    const maxBytes = 100 * 1024 * 1024; // 100MB
    if (file.size > maxBytes) {
      return `File exceeds maximum allowed upload size (100 MB). Size: ${(file.size / 1024 / 1024).toFixed(2)} MB.`;
    }
    if (file.size === 0) {
      return 'File is empty (0 bytes). Please select a valid capture file.';
    }
    return null;
  };

  const handleFileSelection = (file: File) => {
    const err = validateFile(file);
    if (err) {
      setUploadError(err);
      setSelectedFile(null);
    } else {
      setUploadError(null);
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const serverId = selectedServerId ? parseInt(selectedServerId, 10) : undefined;
      const imported = await ingestionApi.uploadPcap(selectedFile, serverId);
      showToast(`PCAP '${imported.original_filename}' uploaded. Streaming ingestion queued.`, 'success');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess(imported);
    } catch (err: any) {
      const msg = err?.message || 'Failed to upload PCAP file';
      setUploadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="soc-card p-5 bg-background-surface/90 border border-border rounded-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-sentra-cyan" />
            Authorized PCAP Traffic Ingestion
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload offline network capture files (.pcap, .pcapng) for streaming packet extraction and directional flow aggregation.
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-border shrink-0 self-start sm:self-auto">
          Offline Capture Import
        </span>
      </div>

      {/* Safety Notice */}
      <div className="p-3 rounded-lg bg-sentra-cyan/10 border border-sentra-cyan/25 flex items-start gap-2.5 text-xs text-slate-300">
        <Info className="w-4 h-4 text-sentra-cyan shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-sentra-cyan">Unidirectional Processing Mode:</span> Captured flows are aggregated strictly in the forward direction. Reverse ACK/handshake packets are treated as independent unidirectional flows. Raw payload contents are not persisted.
        </div>
      </div>

      <form onSubmit={handleUploadSubmit} className="space-y-4">
        {/* Monitored Server Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Associate with Monitored Network Asset (Optional)
          </label>
          <select
            value={selectedServerId}
            onChange={(e) => setSelectedServerId(e.target.value)}
            className="w-full bg-background-card border border-border text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-sentra-cyan focus:ring-1 focus:ring-sentra-cyan/20"
          >
            <option value="">General Tap Feed / Unassigned Asset</option>
            {servers.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.name} ({srv.ipAddress} • {srv.environment})
              </option>
            ))}
          </select>
        </div>

        {/* Drop Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-sentra-cyan bg-sentra-cyan/10'
              : selectedFile
              ? 'border-emerald-500/50 bg-emerald-500/5'
              : 'border-border hover:border-slate-600 bg-background-card/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pcap,.pcapng,.cap"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-400">
                <FileCheck className="w-8 h-8" />
              </div>
              <span className="text-sm font-semibold text-slate-100">{selectedFile.name}</span>
              <span className="text-xs font-mono text-slate-400">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for ingestion
              </span>
              <span className="text-[11px] text-sentra-cyan hover:underline mt-1">
                Click or drop another file to change
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-slate-800 text-slate-400">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="text-xs text-slate-200 font-medium">
                <span className="text-sentra-cyan hover:underline">Click to browse</span> or drag and drop a capture file
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Supported: .pcap, .pcapng, .cap (Max 100 MB)
              </span>
            </div>
          )}
        </div>

        {/* Error Feedback */}
        {uploadError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-500">
            {selectedFile ? `Selected: ${selectedFile.name}` : 'No capture file chosen'}
          </div>

          <div className="flex items-center gap-2">
            {selectedFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setUploadError(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                disabled={isUploading}
              >
                Clear
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={isUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Streaming Upload...' : 'Ingest & Parse PCAP'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
