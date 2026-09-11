import React, { useEffect, useState } from 'react';
import { 
  Search, 
  RefreshCw, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { AdminDetailModal } from '../AdminDetailModal';
import type { AdminDetailItem } from '../AdminDetailModal';

interface SessionRecord {
  id: string;
  sessionId: string;
  target: string;
  source: string;
  sourceId?: string;
  status: string;
  progressPercent: number;
  errorMessage?: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export const AdminSearchSessionsTab: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail modal state
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<AdminDetailItem | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminSearchSessions({
        search,
        status: statusFilter,
        source: sourceFilter,
        page,
        limit: 10,
      });
      setSessions(data.sessions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || 'Failed to load search sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [page, statusFilter, sourceFilter]);

  const handleRowClick = async (session: SessionRecord) => {
    try {
      const detail = await apiClient.getAdminSearchSessionDetail(session.id);
      const targetObj = detail.target;
      const resultObj = detail.result;

      setSelectedSessionDetail({
        title: `Search Session // ${session.target}`,
        subtitle: `Session ID: ${session.id}`,
        badge: {
          text: session.status,
          color: session.status === 'TARGET_ACQUIRED' || session.status === 'DETECTED'
            ? 'green'
            : session.status === 'PROCESSING' || session.status === 'SEARCHING'
            ? 'blue'
            : session.status === 'NOT_DETECTED'
            ? 'amber'
            : 'red',
        },
        fields: [
          { label: 'Target Object', value: session.target },
          { label: 'Target Color', value: targetObj?.targetColor || 'ANY' },
          { label: 'Source Type', value: session.source },
          { label: 'Execution Status', value: session.status },
          { label: 'Progress Percentage', value: `${session.progressPercent}%` },
          { label: 'Started Timestamp', value: session.startedAt ? new Date(session.startedAt).toLocaleString() : 'N/A' },
          { label: 'Completed Timestamp', value: session.completedAt ? new Date(session.completedAt).toLocaleString() : 'Active/In-Progress' },
          { label: 'Target Match Found', value: resultObj?.targetFound ? 'YES' : 'NO' },
          { label: 'Detected Tracks', value: `${detail.tracks?.length || 0} tracks recorded` },
          { label: 'Telemetry Events', value: `${detail.events?.length || 0} events` },
          { label: 'Error Diagnostics', value: session.errorMessage || 'None (Clean)' },
        ],
        evidence: {
          sessionId: session.id,
          hasImage: Boolean(detail.detections && detail.detections.length > 0),
        },
        rawJson: detail,
      });
    } catch (err: any) {
      alert(`Failed to load details: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Search & Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchSessions(); }} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sessions by target, ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="TARGET_ACQUIRED">TARGET_ACQUIRED</option>
            <option value="DETECTED">DETECTED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="NOT_DETECTED">NOT_DETECTED</option>
            <option value="QUEUED">QUEUED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none"
          >
            <option value="">All Sources</option>
            <option value="CAMERA">CAMERA</option>
            <option value="VIDEO">VIDEO</option>
          </select>

          <button
            type="button"
            onClick={fetchSessions}
            title="Refresh Sessions"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs uppercase font-semibold">Loading search sessions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Search className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No search sessions found.</p>
            <p className="text-[11px] text-slate-400">Run a search from the operator dashboard to generate sessions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Started</th>
                  <th className="py-3 px-4">Completed</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((s) => (
                  <tr 
                    key={s.id}
                    onClick={() => handleRowClick(s)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {s.id.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.target}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {s.source}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        s.status === 'TARGET_ACQUIRED' || s.status === 'DETECTED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : s.status === 'PROCESSING' || s.status === 'SEARCHING'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : s.status === 'NOT_DETECTED'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {s.progressPercent}%
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {s.startedAt ? new Date(s.startedAt).toLocaleTimeString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {s.completedAt ? new Date(s.completedAt).toLocaleTimeString() : 'In Progress'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
                        View &rarr;
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3.5 px-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total: <strong>{total}</strong> sessions</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg bg-white border border-slate-200 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AdminDetailModal
        isOpen={Boolean(selectedSessionDetail)}
        onClose={() => setSelectedSessionDetail(null)}
        data={selectedSessionDetail}
      />
    </div>
  );
};
