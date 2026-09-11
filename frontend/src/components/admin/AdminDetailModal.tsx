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
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }[data.badge?.color || 'blue'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 select-none font-sans animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[85vh] animate-scale-in"
        style={{
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        }}
      >
        {/* Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-[#4361ee] to-blue-500 shrink-0" />

        {/* Header */}
        <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-200/80 shrink-0">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {data.title}
              </h2>
              {data.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColorClass}`}>
                  {data.badge.text}
                </span>
              )}
            </div>
            {data.subtitle && (
              <p className="text-xs text-slate-500 font-mono">
                {data.subtitle}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {field.label}
                </span>
                <div className="text-xs font-semibold text-slate-800 break-words">
                  {field.value ?? 'N/A'}
                </div>
              </div>
            ))}
          </div>

          {/* Evidence Frame Inspection Section */}
          {data.evidence && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-900">
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
                    className="px-3 py-1 rounded-xl bg-[#4361ee] hover:bg-[#3a56d4] text-white text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showEvidenceViewer ? 'Hide Frame' : 'View Evidence'}</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    EVIDENCE UNAVAILABLE
                  </span>
                )}
              </div>

              {/* Evidence Frame Viewer */}
              {showEvidenceViewer && evidenceUrl && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 bg-black flex flex-col items-center justify-center min-h-[200px] relative">
                  {!imageError ? (
                    <img
                      src={evidenceUrl}
                      alt="Forensic Evidence Detection Frame"
                      onError={() => setImageError(true)}
                      className="w-full max-h-72 object-contain select-none"
                    />
                  ) : (
                    <div className="p-6 text-center space-y-2 text-slate-400">
                      <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider">EVIDENCE UNAVAILABLE</p>
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
            <details className="text-xs text-slate-600 pt-1">
              <summary className="cursor-pointer font-semibold hover:text-indigo-600 transition-colors">
                View Raw Database Telemetry
              </summary>
              <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto border border-slate-800 max-h-48">
                {JSON.stringify(data.rawJson, null, 2)}
              </pre>
            </details>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200/80 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
