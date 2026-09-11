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
    <div className="space-y-5 animate-fade-in font-sans">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cameras by name, ID, zone..."
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
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="ERROR">ERROR</option>
          </select>

          <button
            type="button"
            onClick={fetchCameras}
            title="Refresh Cameras"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-[#4361ee] hover:bg-[#3a56d4] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Camera</span>
          </button>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs uppercase font-semibold">Loading camera streams...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        ) : cameras.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <Camera className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No cameras found.</p>
            <p className="text-[11px] text-slate-400">Add a camera feed or adjust status filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Camera Name</th>
                  <th className="py-3 px-4">Camera ID</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Last Seen</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cameras.map((c) => (
                  <tr 
                    key={c.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {c.name}
                      {c.ptzEnabled && (
                        <span className="ml-2 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          PTZ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {c.id}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.location}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {c.protocol}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        c.status === 'ONLINE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : c.status === 'ERROR'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          c.status === 'ONLINE' ? 'bg-emerald-500 animate-pulse' : c.status === 'ERROR' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">
                      {c.lastConnectedAt ? new Date(c.lastConnectedAt).toLocaleString() : 'Live'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(c)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ml-auto ${
                          c.status === 'ONLINE'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
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
        <div className="p-3.5 px-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total: <strong>{total}</strong> cameras</span>
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

      {/* Add Camera Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Register Surveillance Camera</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCamera} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Zone E // Loading Bay"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Location / Zone</label>
                <input
                  type="text"
                  required
                  value={addForm.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                  placeholder="Perimeter Sector 4"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Protocol / Driver</label>
                <select
                  value={addForm.protocol}
                  onChange={(e) => setAddForm({ ...addForm, protocol: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none"
                >
                  <option value="RTSP">RTSP Stream (Standard H.264/H.265)</option>
                  <option value="ONVIF_PTZ">ONVIF PTZ Pan-Tilt-Zoom</option>
                  <option value="USB_WEBCAM">USB Hardware Direct Device</option>
                  <option value="WEBRTC">WebRTC WHEP Stream</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1">Stream URI</label>
                <input
                  type="text"
                  required
                  value={addForm.uri}
                  onChange={(e) => setAddForm({ ...addForm, uri: e.target.value })}
                  placeholder="rtsp://127.0.0.1:8554/live/stream"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#4361ee] hover:bg-[#3a56d4] text-white font-bold transition-all shadow-xs cursor-pointer"
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
