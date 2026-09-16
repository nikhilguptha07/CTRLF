import React, { useEffect, useState } from 'react';
import { 
  Crosshair, 
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

interface DetectionRecord {
  detectionId: string | number;
  object: string;
  confidence: number;
  trackId: string;
  frame: number;
  timestamp: string;
  timestampSeconds: number;
  camera: string;
  session: string;
  hasImage: boolean;
  detectedAt: string | null;
  status?: string;
  boundingBox?: any;
}

export const AdminDetectionsTab: React.FC = () => {
  const [detections, setDetections] = useState<DetectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [cameraFilter, setCameraFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedDetection, setSelectedDetection] = useState<AdminDetailItem | null>(null);

  const fetchDetections = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminDetections({
        search,
        camera: cameraFilter,
        page,
        limit: 10,
      });
      setDetections(data.detections);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || 'Failed to load detections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetections();
  }, [page, cameraFilter]);

  const handleRowClick = (d: DetectionRecord) => {
    setSelectedDetection({
      title: `Detection Record // ${d.object}`,
      subtitle: `Detection ID: #${d.detectionId}`,
      badge: {
        text: `${(d.confidence * 100).toFixed(1)}% Confidence`,
        color: d.confidence >= 0.8 ? 'green' : d.confidence >= 0.5 ? 'blue' : 'amber',
      },
      fields: [
        { label: 'Object Classification', value: d.object },
        { label: 'Model Confidence', value: `${(d.confidence * 100).toFixed(2)}%` },
        { label: 'Track Identifier', value: d.trackId || 'N/A' },
        { label: 'Video Frame Number', value: String(d.frame ?? 'N/A') },
        { label: 'Relative Timestamp', value: d.timestamp || `${d.timestampSeconds}s` },
        { label: 'Camera / Stream', value: d.camera || 'N/A' },
        { label: 'Associated Session', value: d.session || 'N/A' },
        { label: 'Evidence Frame Stored', value: d.hasImage ? 'YES (Oracle BLOB)' : 'NO' },
        { label: 'Detection Timestamp', value: d.detectedAt ? new Date(d.detectedAt).toLocaleString() : 'N/A' },
      ],
      evidence: {
        detectionId: d.detectionId,
        sessionId: d.session,
        hasImage: d.hasImage,
        frameNumber: d.frame,
      },
      rawJson: d as unknown as Record<string, unknown>,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-100">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchDetections(); }} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search detections by object, ID, camera..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={cameraFilter}
            onChange={(e) => { setCameraFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          >
            <option value="">All Cameras</option>
            <option value="CAM_01">CAM_01</option>
            <option value="CAM_02">CAM_02</option>
            <option value="CAM_03">CAM_03</option>
            <option value="CAM_04">CAM_04</option>
          </select>

          <button
            type="button"
            onClick={fetchDetections}
            title="Refresh Detections"
            className="p-2 rounded-xl bg-[#161e2e] hover:bg-[#1e2a3f] border border-[#1a2536] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00c4df]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Detections Table */}
      <div className="rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00c4df]" />
            <p className="text-xs uppercase font-mono font-semibold">Loading detection records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold font-mono">{error}</p>
          </div>
        ) : detections.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Crosshair className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No detection records found.</p>
            <p className="text-[11px] text-slate-500">Run an optical search to generate genuine detections.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a2536] bg-[#161e2e]/80 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Detection ID</th>
                  <th className="py-3 px-4">Object</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Track ID</th>
                  <th className="py-3 px-4">Frame</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Camera</th>
                  <th className="py-3 px-4">Session</th>
                  <th className="py-3 px-4 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141c2b]">
                {detections.map((d) => (
                  <tr 
                    key={String(d.detectionId)}
                    onClick={() => handleRowClick(d)}
                    className="hover:bg-[#161e2e]/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-[#00c4df]">
                      #{String(d.detectionId).slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {d.object}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-extrabold text-emerald-400">
                        {(d.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {d.trackId}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {d.frame}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {d.timestamp}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {d.camera}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {String(d.session).slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(d);
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
          <span>Total: <strong className="text-white">{total}</strong> detections</span>
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
        isOpen={Boolean(selectedDetection)}
        onClose={() => setSelectedDetection(null)}
        data={selectedDetection}
      />
    </div>
  );
};
