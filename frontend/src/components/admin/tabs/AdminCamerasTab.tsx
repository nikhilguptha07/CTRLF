import React, { useEffect, useState } from 'react';
import { 
  Camera, 
  Plus, 
  Search, 
  RefreshCw, 
  AlertTriangle,
  Power,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

interface CameraRecord {
  id: string;
  name: string;
  location: string;
  protocol: string;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR';
  ptzEnabled: boolean;
  resolution: string;
  fps: number;
  lastConnectedAt: string | null;
  createdAt: string;
}

export const AdminCamerasTab: React.FC = () => {
  const [cameras, setCameras] = useState<CameraRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add camera modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    location: '',
    protocol: 'RTSP',
    uri: '',
  });

  const fetchCameras = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminCameras({
        search,
        status: statusFilter,
        page,
        limit: 10,
      });
      setCameras(data.cameras);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err: any) {
      setError(err?.message || 'Failed to load camera feeds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCameras();
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.createAdminCamera(addForm);
      setShowAddModal(false);
      setAddForm({ name: '', location: '', protocol: 'RTSP', uri: '' });
      await fetchCameras();
    } catch (err: any) {
      alert(`Camera registration failed: ${err?.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (camera: CameraRecord) => {
    const nextStatus = camera.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
    try {
      await apiClient.updateAdminCamera(camera.id, { status: nextStatus });
      await fetchCameras();
    } catch (err: any) {
      alert(`Status toggle failed: ${err?.message || err}`);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-100">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cameras by name, ID, zone..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          >
            <option value="">All Statuses</option>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="ERROR">ERROR</option>
          </select>

          <button
            type="button"
            onClick={fetchCameras}
            title="Refresh Cameras"
            className="p-2 rounded-xl bg-[#161e2e] hover:bg-[#1e2a3f] border border-[#1a2536] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00c4df]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#00c4df] hover:bg-[#00b2cb] text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Camera</span>
          </button>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00c4df]" />
            <p className="text-xs uppercase font-mono font-semibold">Loading camera streams...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold font-mono">{error}</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Camera className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No cameras found.</p>
            <p className="text-[11px] text-slate-500">Add a camera feed or adjust status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a2536] bg-[#161e2e]/80 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Camera Name</th>
                  <th className="py-3 px-4">Camera ID</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141c2b]">
                {cameras.map((c) => (
                  <tr 
                    key={c.id}
                    className="hover:bg-[#161e2e]/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      {c.name}
                      {c.ptzEnabled && (
                        <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          PTZ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {c.id}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {c.location}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {c.protocol}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        c.status === 'ONLINE'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : c.status === 'ERROR'
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : c.status === 'ERROR' ? 'bg-amber-400' : 'bg-slate-500'
                        }`} />
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] font-mono">
                      {c.lastConnectedAt ? new Date(c.lastConnectedAt).toLocaleString() : 'Live'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ml-auto border ${
                          c.status === 'ONLINE'
                            ? 'bg-[#161e2e] hover:bg-[#1e2a3f] text-slate-300 border-[#1a2536]'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{c.status === 'ONLINE' ? 'Disable' : 'Enable'}</span>
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
          <span>Total: <strong className="text-white">{total}</strong> cameras</span>
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

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md bg-[#0f1520] border border-[#1a2536] rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1a2536] pb-3">
              <h3 className="text-base font-bold text-white">Register Surveillance Camera</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCamera} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Zone E // Loading Bay"
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Location / Zone</label>
                <input
                  type="text"
                  required
                  value={addForm.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                  placeholder="Perimeter Sector 4"
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Protocol / Driver</label>
                <select
                  value={addForm.protocol}
                  onChange={(e) => setAddForm({ ...addForm, protocol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
                >
                  <option value="RTSP">RTSP Stream (Standard H.264/H.265)</option>
                  <option value="ONVIF_PTZ">ONVIF PTZ Pan-Tilt-Zoom</option>
                  <option value="USB_WEBCAM">USB Hardware Direct Device</option>
                  <option value="WEBRTC">WebRTC WHEP Stream</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Stream URI</label>
                <input
                  type="text"
                  required
                  value={addForm.uri}
                  onChange={(e) => setAddForm({ ...addForm, uri: e.target.value })}
                  placeholder="rtsp://127.0.0.1:8554/live/stream"
                  className="w-full px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono focus:ring-1 focus:ring-[#00c4df]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#161e2e] text-slate-300 hover:text-white border border-[#1a2536] font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#00c4df] hover:bg-[#00b2cb] text-slate-950 font-bold transition-all shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Registering...' : 'Register Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
