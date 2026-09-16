import React, { useState } from 'react';
import { 
  Settings, 
  Save, 
  CheckCircle2, 
  Database, 
  HardDrive, 
  Cpu 
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { useExperienceStore } from '../../../store/useExperienceStore';

interface SystemSettingsState {
  visionModel: string;
  confidenceThreshold: number;
  retentionDays: number;
  rtspBufferMs: number;
  auditLevel: string;
  oracleConnectionMode: string;
  autoPurgeStaleSessions: boolean;
  tamperProofHashing: boolean;
}

const DEFAULT_SETTINGS: SystemSettingsState = {
  visionModel: 'YOLOv8n (COCO-80 Real-Time)',
  confidenceThreshold: 80,
  retentionDays: 90,
  rtspBufferMs: 150,
  auditLevel: 'FORENSIC_CRYPTO',
  oracleConnectionMode: 'THIN_TCP_SOCKET',
  autoPurgeStaleSessions: true,
  tamperProofHashing: true,
};

export const AdminSettingsTab: React.FC = () => {
  const { currentUser } = useExperienceStore();
  const operatorName = currentUser?.fullName || currentUser?.username || 'Super Admin';

  const [settings, setSettings] = useState<SystemSettingsState>(() => {
    try {
      const saved = localStorage.getItem('controlf_admin_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to load local admin settings, using defaults');
    }
    return DEFAULT_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      localStorage.setItem('controlf_admin_settings', JSON.stringify(settings));

      // Record administrative audit event
      apiClient.recordAuditEvent({
        action: 'SYSTEM_SETTINGS_UPDATED',
        resourceType: 'SYSTEM_SETTINGS',
        resourceId: 'GLOBAL_CONFIG',
        details: {
          operator: operatorName,
          visionModel: settings.visionModel,
          confidenceThreshold: settings.confidenceThreshold,
          retentionDays: settings.retentionDays,
          auditLevel: settings.auditLevel,
          savedAt: new Date().toISOString(),
        },
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to persist admin settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c121d] border border-[#1a273c] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#00e5ff]" />
            <h2 className="text-base font-extrabold text-white tracking-tight uppercase font-mono">
              System Configuration & Persistent Policies
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global inference models, retention policies, and cryptographic audit parameters for ControlF platform.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>CONFIGURATION COMMITTED</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 1: AI Vision & Inference Engine */}
        <div className="p-5 rounded-2xl bg-[#0c121d] border border-[#1a273c] space-y-4 shadow-inner">
          <div className="flex items-center gap-2 border-b border-[#162134] pb-2.5">
            <Cpu className="w-4 h-4 text-[#00e5ff]" />
            <h3 className="text-xs font-bold uppercase font-mono text-white tracking-wider">
              Computer Vision & Inference Pipeline
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-[11px] uppercase text-slate-400 font-bold block mb-1.5">
                Target Detection Model
              </label>
              <select
                value={settings.visionModel}
                onChange={(e) => setSettings({ ...settings, visionModel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#080d15] border border-[#1e2c42] text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              >
                <option value="YOLOv8n (COCO-80 Real-Time)">YOLOv8n (COCO-80 Real-Time // Low Latency)</option>
                <option value="YOLOv8x (High Precision Optical)">YOLOv8x (High Precision Optical // Maximum Depth)</option>
                <option value="CLIP-ViT-L/14 (Semantic Re-ID)">CLIP-ViT-L/14 (Semantic Natural Language Re-ID)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Primary neural backbone executed for CCTV object localization.
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] uppercase text-slate-400 font-bold">
                  Minimum Confidence Floor
                </label>
                <span className="text-emerald-400 font-bold">{settings.confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={settings.confidenceThreshold}
                onChange={(e) => setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })}
                className="w-full accent-[#00e5ff] cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Matches below this threshold will not generate verified forensic candidate frames.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Surveillance Storage & Evidence Retention */}
        <div className="p-5 rounded-2xl bg-[#0c121d] border border-[#1a273c] space-y-4 shadow-inner">
          <div className="flex items-center gap-2 border-b border-[#162134] pb-2.5">
            <HardDrive className="w-4 h-4 text-[#00e5ff]" />
            <h3 className="text-xs font-bold uppercase font-mono text-white tracking-wider">
              Surveillance Ingestion & Evidence Retention
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-[11px] uppercase text-slate-400 font-bold block mb-1.5">
                Evidence Archival Window
              </label>
              <select
                value={settings.retentionDays}
                onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#080d15] border border-[#1e2c42] text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              >
                <option value={14}>14 Days (Rolling Buffer)</option>
                <option value={30}>30 Days (Standard Corporate Compliance)</option>
                <option value={90}>90 Days (Enterprise Security Recommended)</option>
                <option value={365}>365 Days (Full Forensic Archival)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Evidence frames are cryptographically preserved in Oracle 21c XE before automatic purge.
              </span>
            </div>

            <div>
              <label className="text-[11px] uppercase text-slate-400 font-bold block mb-1.5">
                CCTV RTSP Stream Jitter Buffer
              </label>
              <select
                value={settings.rtspBufferMs}
                onChange={(e) => setSettings({ ...settings, rtspBufferMs: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#080d15] border border-[#1e2c42] text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              >
                <option value={50}>50ms (Ultra-Low Latency // High Bandwidth Required)</option>
                <option value={150}>150ms (Balanced Operational Default)</option>
                <option value={300}>300ms (High Resilience // Variable Network Jitter)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Target buffer window for live H.264/H.265 surveillance decoders.
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Database & Cryptographic Audit Integrity */}
        <div className="p-5 rounded-2xl bg-[#0c121d] border border-[#1a273c] space-y-4 shadow-inner">
          <div className="flex items-center gap-2 border-b border-[#162134] pb-2.5">
            <Database className="w-4 h-4 text-[#00e5ff]" />
            <h3 className="text-xs font-bold uppercase font-mono text-white tracking-wider">
              Oracle 21c XE & Audit Security Integrity
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="text-[11px] uppercase text-slate-400 font-bold block mb-1.5">
                Audit Logging Precision Level
              </label>
              <select
                value={settings.auditLevel}
                onChange={(e) => setSettings({ ...settings, auditLevel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#080d15] border border-[#1e2c42] text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              >
                <option value="INFO">INFO (Standard User Logins & Status Updates)</option>
                <option value="DETAILED">DETAILED (Every PTZ Sweep & Search Session)</option>
                <option value="FORENSIC_CRYPTO">FORENSIC_CRYPTO (Full SHA-256 Hashes On Every Detection & Report)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Immutable audit ledger recording administrator and operator actions.
              </span>
            </div>

            <div>
              <label className="text-[11px] uppercase text-slate-400 font-bold block mb-1.5">
                Driver Transport Protocol
              </label>
              <select
                value={settings.oracleConnectionMode}
                onChange={(e) => setSettings({ ...settings, oracleConnectionMode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#080d15] border border-[#1e2c42] text-white focus:outline-none focus:ring-1 focus:ring-[#00e5ff]"
              >
                <option value="THIN_TCP_SOCKET">Pure Thin Driver (Direct TCP/IP Socket // Zero Client)</option>
                <option value="OCI_HYBRID">OCI Thick Mode (Requires Instant Client Libraries)</option>
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Connected to Oracle Database 21c XE (XEPDB1, Port 1521).
              </span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-[#00e5ff] hover:bg-[#00cce6] text-[#080b11] font-extrabold text-xs font-mono uppercase tracking-wider shadow-[0_0_15px_rgba(0,229,255,0.4)] flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'PERSISTING...' : 'SAVE SYSTEM SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
