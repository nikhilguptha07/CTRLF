import React, { useState } from 'react';
import { X, Eye, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export interface AdminDetailItem {
  title: string;
  subtitle?: string;
  badge?: { text: string; color?: 'green' | 'blue' | 'amber' | 'red' | 'purple' };
  fields: Array<{ label: string; value: React.ReactNode }>;
  evidence?: {
    detectionId?: string | number;
    sessionId?: string;
    hasImage?: boolean;
    frameNumber?: number;
    customUrl?: string;
  };
  rawJson?: Record<string, unknown>;
}

interface AdminDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AdminDetailItem | null;
}

export const AdminDetailModal: React.FC<AdminDetailModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const [showEvidenceViewer, setShowEvidenceViewer] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (!isOpen || !data) return null;

  const getEvidenceUrl = () => {
    if (data.evidence?.customUrl) {
      return data.evidence.customUrl;
    }
    if (data.evidence?.detectionId) {
      return `${apiClient.getBaseUrl()}/api/detections/${encodeURIComponent(data.evidence.detectionId)}/image`;
    }
    if (data.evidence?.sessionId) {
      return apiClient.getEvidenceFrameUrl(data.evidence.sessionId, {
        frameNumber: data.evidence.frameNumber,
      });
    }
    return null;
  };

  const evidenceUrl = getEvidenceUrl();
  const hasEvidence = Boolean(data.evidence && (data.evidence.hasImage || data.evidence.detectionId || data.evidence.sessionId));

  const badgeColorClass = {
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    blue: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  }[data.badge?.color || 'blue'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none font-sans animate-fade-in text-slate-100">
      <div 
        className="relative w-full max-w-xl bg-[#0f1520] border border-[#1a2536] rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh] animate-scale-in"
      >
        {/* Accent Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-[#00c4df] to-blue-500 shrink-0" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-[#1a2536] shrink-0">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-lg font-extrabold text-white tracking-tight">
                {data.title}
              </h2>
              {data.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColorClass}`}>
                  {data.badge.text}
                </span>
              )}
            </div>
            {data.subtitle && (
              <p className="text-xs text-slate-400 font-mono">
                {data.subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#161e2e] transition-colors cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Key-Value Attributes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.fields.map((field, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-2xl bg-[#161e2e]/50 border border-[#1a2536] space-y-1"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block font-mono">
                  {field.label}
                </span>
                <div className="text-xs font-semibold text-slate-200 break-words">
                  {field.value ?? 'N/A'}
                </div>
              </div>
            ))}
          </div>

          {/* Evidence Frame Inspection Section */}
          {data.evidence && (
            <div className="p-4 rounded-2xl bg-[#161e2e]/60 border border-[#1a2536] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#00c4df]" />
                  <span className="text-xs font-bold text-white">
                    Forensic Optical Evidence Frame
                  </span>
                </div>

                {hasEvidence && evidenceUrl ? (
                  <button
                    type="button"
                    onClick={() => {
                      setImageError(false);
                      setShowEvidenceViewer((prev) => !prev);
                    }}
                    className="px-3 py-1 rounded-xl bg-[#00c4df] hover:bg-[#00b2cb] text-slate-950 text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showEvidenceViewer ? 'Hide Frame' : 'View Evidence'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider font-mono">
                    EVIDENCE UNAVAILABLE
                  </span>
                )}
              </div>

              {/* Evidence Frame Viewer */}
              {showEvidenceViewer && evidenceUrl && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-[#1a2536] bg-[#070a10] flex flex-col items-center justify-center min-h-[200px] relative">
                  {!imageError ? (
                    <img
                      src={evidenceUrl}
                      alt="Forensic Evidence Detection Frame"
                      onError={() => setImageError(true)}
                      className="w-full max-h-72 object-contain select-none"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-2 text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-400" />
                      <p className="text-xs font-semibold uppercase tracking-wider font-mono">EVIDENCE UNAVAILABLE</p>
                      <p className="text-[11px] text-slate-500 max-w-xs">
                        The video frame raw artifact is no longer stored on the server or could not be streamed from the Oracle BLOB store.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Raw JSON inspection toggle if provided */}
          {data.rawJson && (
            <details className="text-xs text-slate-400 pt-1 font-mono">
              <summary className="cursor-pointer font-semibold hover:text-[#00c4df] transition-colors">
                View Raw Database Telemetry
              </summary>
              <pre className="mt-2 p-3 rounded-xl bg-[#090d14] text-slate-200 text-[11px] font-mono overflow-x-auto border border-[#1a2536] max-h-48">
                {JSON.stringify(data.rawJson, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-[#161e2e]/40 border-t border-[#1a2536] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#161e2e] hover:bg-[#1e2a3f] text-slate-200 border border-[#1a2536] text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
