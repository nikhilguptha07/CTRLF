import React, { useEffect, useState } from 'react';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { AdminDetailModal } from '../AdminDetailModal';
import type { AdminDetailItem } from '../AdminDetailModal';

interface TrackRecord {
  id: string;
  trackId: string;
  rawTrackId?: number;
  object: string;
  color: string;
  confidence: number;
  frameIndex: number;
  timestampMs: number;
  status: string;
  searchId: string;
  createdAt: string | null;
}

export const AdminTracksTab: React.FC = () => {
  const [tracks, setTracks] = useState<TrackRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedTrack, setSelectedTrack] = useState<AdminDetailItem | null>(null);

  const fetchTracks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminTracks({
        search,
        page,
        limit: 10,
      });
      setTracks(data.tracks);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
  }, [page]);

  const handleRowClick = (t: TrackRecord) => {
    setSelectedTrack({
      title: `Object Trajectory // ${t.trackId}`,
      subtitle: `Class: ${t.object} · Status: ${t.status}`,
      badge: {
        text: t.status,
        color: t.status === 'TRACKING' || t.status === 'MATCHED' ? 'green' : 'blue',
      },
      fields: [
        { label: 'Track Identifier', value: t.trackId },
        { label: 'Object Class', value: t.object },
        { label: 'Dominant Color', value: t.color || 'ANY' },
        { label: 'Confidence Score', value: `${(t.confidence * 100).toFixed(1)}%` },
        { label: 'Key Frame Index', value: String(t.frameIndex ?? 'N/A') },
        { label: 'Timestamp (ms)', value: `${t.timestampMs} ms` },
        { label: 'Search Session', value: t.searchId || 'N/A' },
        { label: 'Recorded At', value: t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A' },
      ],
      evidence: {
        sessionId: t.searchId,
        hasImage: true,
      },
      rawJson: t as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-100">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchTracks(); }} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracks by ID, object class, color..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          />
        </form>

        <button
          type="button"
          onClick={fetchTracks}
          title="Refresh Tracks"
          className="p-2 rounded-xl bg-[#161e2e] hover:bg-[#1e2a3f] border border-[#1a2536] text-slate-300 hover:text-white transition-colors cursor-pointer ml-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00c4df]' : ''}`} />
        </button>
      </div>

      {/* Tracks Table */}
      <div className="rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00c4df]" />
            <p className="text-xs uppercase font-mono font-semibold">Loading ByteTrack trajectories...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold font-mono">{error}</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Activity className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No object tracks found.</p>
            <p className="text-[11px] text-slate-500">ByteTrack multi-frame trajectories will appear as searches execute.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a2536] bg-[#161e2e]/80 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Track ID</th>
                  <th className="py-3 px-4">Object</th>
                  <th className="py-3 px-4">Color</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Frame</th>
                  <th className="py-3 px-4">Timestamp (ms)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141c2b]">
                {tracks.map((t) => (
                  <tr 
                    key={t.id}
                    onClick={() => handleRowClick(t)}
                    className="hover:bg-[#161e2e]/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#00c4df]">
                      {t.trackId}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {t.object}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-[#161e2e] border border-[#1a2536] text-[11px] font-mono text-slate-300">
                        {t.color}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                      {(t.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {t.frameIndex}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {t.timestampMs} ms
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {String(t.searchId).slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(t);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-[#161e2e] hover:bg-[#1e2a3f] border border-[#1a2536] text-[#00c4df] text-[11px] font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-3.5 px-4 bg-[#161e2e]/50 border-t border-[#1a2536] flex items-center justify-between text-xs text-slate-400">
          <span>Total: <strong className="text-white">{total}</strong> tracks</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg bg-[#0f1520] border border-[#1a2536] text-slate-300 disabled:opacity-40 cursor-pointer"
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
              className="p-1 rounded-lg bg-[#0f1520] border border-[#1a2536] text-slate-300 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AdminDetailModal
        isOpen={Boolean(selectedTrack)}
        onClose={() => setSelectedTrack(null)}
        data={selectedTrack}
      />
    </div>
  );
};
