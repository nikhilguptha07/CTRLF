import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, AlertTriangle, ArrowRight, Download, RefreshCw } from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';
import { apiClient } from '../../services/apiClient';

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
  const { startSearchFlow } = useExperienceStore();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchHistory = async () => {
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
          confidence: typeof h.confidence === 'number' ? h.confidence : (h.status === 'DETECTED' ? 0 : 0),
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
  }, []);

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
    <div className="space-y-4 animate-fade-in w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Detection & Spatial Audit Logs</span>
          </h2>
          <p className="text-xs text-slate-500">
            Historical ledger of optical embedding matches and real-time CCTV events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchHistory}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit</span>
          </button>
        </div>
      </div>

      {/* Table of logs */}
      <div className="flex-1 rounded-2xl bg-white/70 border border-slate-200/80 overflow-hidden flex flex-col shadow-sm">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 backdrop-blur-md">
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
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 font-mono text-xs">
                    No detections recorded.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                <tr key={log.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{log.id}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {log.object}
                    {log.trackId != null && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-mono font-bold">
                        #{log.trackId}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">{log.time}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="font-mono font-semibold text-blue-600 mr-1.5">{log.camera}</span>
                    {log.location}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={log.confidence > 90 ? 'text-emerald-600' : 'text-slate-500'}>
                      {log.confidence}%
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {log.status === 'FOUND' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Found
                      </span>
                    ) : log.status === 'UNRESOLVED' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Miss
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-semibold">
                        Archived
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => startSearchFlow(log.object)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <span>Re-scan</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
