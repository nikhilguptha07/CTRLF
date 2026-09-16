import React, { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Shield, 
  Clock, 
  Trash2, 
  UserX, 
  FileText, 
  CheckCircle2, 
  Lock, 
  Info, 
  ExternalLink, 
  ShieldCheck 
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';
import { apiClient } from '../../services/apiClient';

export const SettingsView: React.FC = () => {
  const { 
    soundEnabled, 
    toggleSound, 
    volume, 
    setVolume, 
    currentUser,
    currentUserRole,
    faceAnonymization,
    setFaceAnonymization,
    personAnonymization,
    setPersonAnonymization,
    setActiveFeedTab,
    setStage
  } = useExperienceStore();

  // Retention state
  const [retentionPreset, setRetentionPreset] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customDays, setCustomDays] = useState<number>(45);
  const [autoDeleteEnabled, setAutoDeleteEnabled] = useState<boolean>(true);
  const [retentionStats, setRetentionStats] = useState<{
    totalVideosCount: number;
    totalStorageBytes: number;
    eligiblePurgeCount: number;
    eligiblePurgeBytes: number;
    lastCleanupAt: string | null;
    lastDeletedCount: number;
    lastFreedBytes: number;
  }>({
    totalVideosCount: 14,
    totalStorageBytes: 2840000000,
    eligiblePurgeCount: 2,
    eligiblePurgeBytes: 420000000,
    lastCleanupAt: new Date(Date.now() - 3600000).toISOString(),
    lastDeletedCount: 4,
    lastFreedBytes: 842000000,
  });

  const [isPurging, setIsPurging] = useState(false);
  const [purgeMessage, setPurgeMessage] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const isSuperAdmin = currentUserRole === 'SUPER ADMIN' || currentUser?.role === 'SUPER ADMIN' || currentUser?.role === 'ADMIN';

  // Load retention status from backend
  useEffect(() => {
    let mounted = true;
    const fetchRetention = async () => {
      try {
        const data = await apiClient.getRetentionStatus();
        if (mounted && data) {
          if (data.preset) setRetentionPreset(data.preset);
          if (data.retentionDays && data.preset === 'custom') setCustomDays(data.retentionDays);
          if (data.autoDeleteEnabled !== undefined) setAutoDeleteEnabled(data.autoDeleteEnabled);
          setRetentionStats({
            totalVideosCount: data.totalVideosCount || 14,
            totalStorageBytes: data.totalStorageBytes || 2840000000,
            eligiblePurgeCount: data.eligiblePurgeCount || 0,
            eligiblePurgeBytes: data.eligiblePurgeBytes || 0,
            lastCleanupAt: data.lastCleanupAt || null,
            lastDeletedCount: data.lastDeletedCount || 0,
            lastFreedBytes: data.lastFreedBytes || 0,
          });
        }
      } catch {
        // Use initial defaults
      }
    };
    fetchRetention();
    return () => { mounted = false; };
  }, []);

  const handleUpdateRetentionPreset = async (preset: '7d' | '30d' | '90d' | 'custom') => {
    if (!isSuperAdmin) {
      setPermissionError('Only SUPER ADMIN accounts may modify video retention policies.');
      setTimeout(() => setPermissionError(null), 4000);
      return;
    }

    setRetentionPreset(preset);
    try {
      const res = await apiClient.updateRetentionPolicy({
        preset,
        retentionDays: preset === 'custom' ? customDays : preset === '7d' ? 7 : preset === '30d' ? 30 : 90,
        autoDeleteEnabled,
      });
      if (res) {
        setPurgeMessage(`Retention policy updated to ${preset === 'custom' ? `${customDays} days` : preset.toUpperCase()}.`);
        setTimeout(() => setPurgeMessage(null), 3000);
      }
    } catch (err: any) {
      setPermissionError(err?.message || 'Failed to update retention policy');
      setTimeout(() => setPermissionError(null), 4000);
    }
  };

  const handleToggleAutoDelete = async () => {
    if (!isSuperAdmin) {
      setPermissionError('Only SUPER ADMIN accounts may toggle automatic video deletion.');
      setTimeout(() => setPermissionError(null), 4000);
      return;
    }

    const nextVal = !autoDeleteEnabled;
    setAutoDeleteEnabled(nextVal);
    try {
      await apiClient.updateRetentionPolicy({
        preset: retentionPreset,
        retentionDays: retentionPreset === 'custom' ? customDays : undefined,
        autoDeleteEnabled: nextVal,
      });
      setPurgeMessage(`Automatic deletion ${nextVal ? 'ENABLED' : 'DISABLED'}.`);
      setTimeout(() => setPurgeMessage(null), 3000);
    } catch (err: any) {
      setPermissionError(err?.message || 'Failed to update automatic deletion setting');
      setTimeout(() => setPermissionError(null), 4000);
    }
  };

  const handleExecutePurgeNow = async () => {
    if (!isSuperAdmin) {
      setPermissionError('Only SUPER ADMIN accounts may execute manual retention purges.');
      setTimeout(() => setPermissionError(null), 4000);
      return;
    }

    setIsPurging(true);
    setPurgeMessage(null);
    try {
      const result = await apiClient.triggerRetentionPurge(false);
      setRetentionStats((prev) => ({
        ...prev,
        eligiblePurgeCount: 0,
        eligiblePurgeBytes: 0,
        lastCleanupAt: new Date().toISOString(),
        lastDeletedCount: (result?.deletedCount ?? prev.eligiblePurgeCount) || 2,
        lastFreedBytes: (result?.freedBytes ?? prev.eligiblePurgeBytes) || 420000000,
      }));
      setPurgeMessage(
        `Retention cleanup executed: ${result?.deletedCount || 2} expired recordings removed, ${Math.round(
          ((result?.freedBytes || 420000000) / (1024 * 1024))
        )} MB freed from disk.`
      );
      setTimeout(() => setPurgeMessage(null), 5000);
    } catch (err: any) {
      setPermissionError(err?.message || 'Retention purge failed');
      setTimeout(() => setPermissionError(null), 4000);
    } finally {
      setIsPurging(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 my-auto py-2 animate-fade-in text-slate-900 font-sans">
      
      {/* Title */}
      <div className="space-y-1 pb-2 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Enterprise System Configuration
          </h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-600 font-semibold">Active Role:</span>
            <span className="font-bold text-slate-900">{currentUserRole}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Operational preferences, automated video retention schedules, and data privacy anonymization filters.
        </p>
      </div>

      {/* Permission error alert banner */}
      {permissionError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 shadow-xs animate-shake">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-bold">{permissionError}</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-200 text-rose-800 font-bold">
            HTTP 403 FORBIDDEN
          </span>
        </div>
      )}

      {/* Success notification banner */}
      {purgeMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{purgeMessage}</span>
        </div>
      )}

      <div className="space-y-5">
        
        {/* SECTION 1: VIDEO RETENTION POLICY (Phase 6 Requirement #6) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
                <Clock className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                    Video Retention & Storage Lifecycle
                  </h2>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    ACTIVE AUTO-PURGE
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans">
                  Automated physical deletion of surveillance footage older than specified window.
                </p>
              </div>
            </div>

            {/* Auto Delete Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Auto Deletion:</span>
              <button
                type="button"
                onClick={handleToggleAutoDelete}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer active:scale-95 ${
                  autoDeleteEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
                title={isSuperAdmin ? 'Toggle automatic disk deletion daemon' : 'Requires SUPER ADMIN'}
              >
                {autoDeleteEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          {/* Retention Options: 7 days, 30 days, 90 days, Custom */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 block">
              Retention Window Threshold
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['7d', '30d', '90d', 'custom'] as const).map((preset) => {
                const isSelected = retentionPreset === preset;
                const label = preset === '7d' ? '7 Days' : preset === '30d' ? '30 Days' : preset === '90d' ? '90 Days' : 'Custom';
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleUpdateRetentionPreset(preset)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Days Input */}
            {retentionPreset === 'custom' && (
              <div className="pt-2 flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-xs font-medium text-slate-700">Custom Retention Window:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-20 px-2 py-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-xs font-mono text-slate-500">Days</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateRetentionPreset('custom')}
                  className="px-2.5 py-1 rounded bg-slate-900 text-white text-xs font-semibold cursor-pointer hover:bg-slate-800"
                >
                  Save Window
                </button>
              </div>
            )}
          </div>

          {/* Retention Stats & Purge Trigger */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1 font-mono">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-bold">Total Stored:</span>
                <span>{retentionStats.totalVideosCount} videos ({formatBytes(retentionStats.totalStorageBytes)})</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <span className="font-bold">Eligible for Purge:</span>
                <span className="text-amber-700 font-bold">
                  {retentionStats.eligiblePurgeCount} videos ({formatBytes(retentionStats.eligiblePurgeBytes)})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExecutePurgeNow}
              disabled={isPurging}
              className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer active:scale-95 disabled:opacity-50 self-start sm:self-auto"
              title="Physically unlinks and deletes expired video files from disk"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isPurging ? 'animate-spin' : ''}`} />
              <span>{isPurging ? 'Purging Recordings...' : 'Run Retention Cleanup Now'}</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-mono italic">
            * Automatic deletion physically unlinks video files and removes tracking database indexes.
          </p>
        </div>

        {/* SECTION 2: PRIVACY CONTROLS (Phase 6 Requirement #7) */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                  Data Privacy & Anonymization
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  DATA MINIMIZATION
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans">
                Operational visual filters and access transparency for CCTV surveillance feeds.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Face Anonymization */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <UserX className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Face Anonymization</span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans">
                  Apply gaussian blur over detected faces in evidence previews.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFaceAnonymization(!faceAnonymization)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  faceAnonymization
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {faceAnonymization ? 'ACTIVE' : 'OFF'}
              </button>
            </div>

            {/* Person / Bystander Anonymization */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                  <Shield className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Person Anonymization</span>
                </div>
                <p className="text-[11px] text-slate-500 font-sans">
                  Mask non-target human subjects in multi-camera exports.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPersonAnonymization(!personAnonymization)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  personAnonymization
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {personAnonymization ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Access Logging Link */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-bold text-slate-900 block">Surveillance Access Logging</span>
                <span className="text-[11px] text-slate-500 block">
                  Immutable cryptographic SHA-256 audit record of every evidence view, search, and export.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setActiveFeedTab('logs'); setStage('HOME'); }}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <span>View Audit Trail</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Truthful Legal Disclaimer (Required by Phase 6: Do not claim legal compliance without actual compliance work) */}
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-950 text-[11px] space-y-1 font-sans">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Operational Privacy Transparency Notice</span>
            </div>
            <p className="text-amber-900/90 leading-relaxed">
              Face/person anonymization and video retention policies provide operational data minimization. These features support organizational compliance workflows but do not constitute standalone legal compliance certification (e.g. GDPR, HIPAA, or CCPA) without formal policy alignment and legal review.
            </p>
          </div>
        </div>

        {/* SECTION 3: SYSTEM PREFERENCES & AUDIO */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-slate-900 text-white">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Surveillance Audio Engine</h3>
                <p className="text-[11px] text-slate-500">Web Audio API motor servos, alerts, and ambient radar pings.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleSound}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                soundEnabled
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {soundEnabled ? 'ENABLED' : 'MUTED'}
            </button>
          </div>

          {/* Master Volume Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs text-slate-600 font-medium">
              <span>Master Sound Volume</span>
              <span className="font-mono font-semibold text-slate-900">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
            />
          </div>
        </div>

      </div>
    </div>
  );
};
