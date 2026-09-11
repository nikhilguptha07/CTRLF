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
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchDetections(); }} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search detections by object, ID, camera..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={cameraFilter}
            onChange={(e) => { setCameraFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none"
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
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Detections Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs uppercase font-semibold">Loading detection records...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : detections.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Crosshair className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No detection records found.</p>
            <p className="text-[11px] text-slate-400">Run an optical search to generate genuine detections.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
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
              <tbody className="divide-y divide-slate-100">
                {detections.map((d) => (
                  <tr 
                    key={String(d.detectionId)}
                    onClick={() => handleRowClick(d)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      #{String(d.detectionId).slice(0, 8)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {d.object}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-extrabold text-emerald-600">
                        {(d.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {d.trackId}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {d.frame}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {d.timestamp}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {d.camera}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-400">
                      {String(d.session).slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(d);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[11px] font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
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
        <div className="p-3.5 px-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total: <strong>{total}</strong> detections</span>
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
        isOpen={Boolean(selectedDetection)}
        onClose={() => setSelectedDetection(null)}
        data={selectedDetection}
      />
    </div>
  );
};
