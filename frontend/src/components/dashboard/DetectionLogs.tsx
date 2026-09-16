import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Download, 
  RefreshCw, 
  Trash2, 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';
import { apiClient } from '../../services/apiClient';
import { LoadingState, EmptyState } from '../ui/UnifiedStates';

interface LogItem {
  id: string;
  object: string;
  time: string;
  location: string;
  camera: string;
  confidence: number;
  status: 'FOUND' | 'UNRESOLVED' | 'ARCHIVED';
  trackId?: number | null;
}

export const DetectionLogs: React.FC = () => {
  const { startSearchFlow, currentUser, isAuthenticated } = useExperienceStore();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchHistory = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const history = await apiClient.getSearchHistory();
      if (Array.isArray(history)) {
        const mapped: LogItem[] = history.map((h: any) => ({
          id: (h.id || 'EVT-0000').slice(0, 8).toUpperCase(),
          object: h.objectName || 'Unknown Item',
          time: new Date(h.createdAt || Date.now()).toTimeString().split(' ')[0] + ' UTC',
          location: h.status === 'DETECTED' ? 'Surveillance Zone Alpha // Desk Surface' : 'All Monitored Sectors',
          camera: 'CAM-01',
          confidence: typeof h.confidence === 'number' ? h.confidence : (h.status === 'DETECTED' ? 95 : 0),
          status: h.status === 'DETECTED' ? 'FOUND' : 'UNRESOLVED',
          trackId: h.trackId != null ? Number(h.trackId) : null,
        }));
        setLogs(mapped);
      }
    } catch {
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isAuthenticated, currentUser]);

  const handleClearDatabase = async () => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      'Are you sure you want to clear all operational search data, detections, and audit logs from the database? This action is irreversible.'
    );
    if (!confirmed) return;

    setIsClearing(true);
    setClearSuccessMsg(null);
    try {
      const res = await apiClient.clearDatabase();
      setClearSuccessMsg(`Database cleared successfully (${res.recordsRemoved} records removed).`);
      setLogs([]);
      setTimeout(() => setClearSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to clear database');
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportCsv = () => {
    const headers = 'Event ID,Target Object,Timestamp,Camera & Location,Match Confidence,Status\n';
    const rows = logs
      .map((l) => `${l.id},"${l.object}",${l.time},"${l.camera} - ${l.location}",${l.confidence}%,${l.status}`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `controlf_surveillance_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3.5 animate-fade-in w-full h-full flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#00c4df]" />
            <span>Detection & Spatial Audit Logs</span>
          </h2>
          <p className="text-xs text-slate-400">
            Historical ledger of optical embedding matches and real-time CCTV events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={handleClearDatabase}
              disabled={isClearing}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
              title="Clear operational data from database (Admin Only)"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isClearing ? 'animate-spin' : ''}`} />
              <span>{isClearing ? 'Clearing...' : 'Clear Data'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchHistory}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs font-semibold text-slate-200 hover:bg-[#1a2536] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#00c4df]' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="px-3 py-1.5 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs font-semibold text-slate-200 hover:bg-[#1a2536] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit</span>
          </button>
        </div>
      </div>

      {/* RBAC Visibility Banner */}
      {isAdmin ? (
        <div className="p-2.5 px-3.5 rounded-xl bg-[#161e2e] border border-[#1a2536] flex items-center justify-between text-xs text-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00c4df] shrink-0" />
            <span className="font-semibold text-white">
              Administrator View: Viewing Global Activity Across All Operators & Cameras
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[#00c4df]/10 border border-[#00c4df]/30 text-[#00c4df] text-[10px] font-mono font-bold shadow-2xs">
            FULL SYSTEM ACCESS
          </span>
        </div>
      ) : (
        <div className="p-2.5 px-3.5 rounded-xl bg-[#161e2e] border border-[#1a2536] flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-300">
              Operator View ({currentUser?.fullName || currentUser?.username || 'Operator'}): Viewing Your Own Search Sessions. Global data is restricted to Administrators.
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[#0f1520] border border-[#1a2536] text-slate-400 text-[10px] font-mono font-bold">
            USER ACCESS ONLY
          </span>
        </div>
      )}

      {/* Clear Success Feedback */}
      {clearSuccessMsg && (
        <div className="p-2.5 px-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{clearSuccessMsg}</span>
        </div>
      )}

      {/* Table of logs */}
      <div className="flex-1 rounded-2xl bg-[#0f1520] border border-[#1a2536] overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161e2e] text-slate-400 font-mono font-semibold border-b border-[#1a2536] sticky top-0 backdrop-blur-md">
              <tr>
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-4">Target Object</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Camera & Location</th>
                <th className="py-2.5 px-4">Match %</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2536]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <LoadingState 
                      message="Querying Oracle 21c XE Ledger..." 
                      subMessage="Synchronizing audit chain and event checkpoints" 
                    />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8">
                    <EmptyState
                      icon={Clock}
                      title="No Search Records in Database"
                      description={isAdmin ? "All past operational search data and telemetry records have been cleared." : "You have not performed any object searches yet. Start a new search from the dashboard."}
                      actionLabel="Initiate Search"
                      onAction={() => startSearchFlow('bottle')}
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#161e2e]/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">{log.id}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {log.object}
                      {log.trackId != null && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-[#00c4df]/10 border border-[#00c4df]/20 text-[#00c4df] text-[10px] font-mono font-bold">
                          #{log.trackId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{log.time}</td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-mono font-semibold text-[#00c4df] mr-1.5">{log.camera}</span>
                      {log.location}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={log.confidence > 90 ? 'text-emerald-400' : 'text-slate-400'}>
                        {log.confidence.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'FOUND' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Found
                        </span>
                      ) : log.status === 'UNRESOLVED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          Miss
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#161e2e] text-slate-400 border border-[#1a2536] text-[10px] font-semibold">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => startSearchFlow(log.object)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00c4df] hover:text-[#00d8f6] transition-colors cursor-pointer"
                      >
                        <span>Re-scan</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
