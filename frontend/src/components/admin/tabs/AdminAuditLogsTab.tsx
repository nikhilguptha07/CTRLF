import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import { AdminDetailModal } from '../AdminDetailModal';
import type { AdminDetailItem } from '../AdminDetailModal';

interface AuditRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  resourceType: string;
  resourceId?: string;
  status: 'SUCCESS' | 'FAILURE';
  requestId: string;
  ipAddress: string;
  currentHash?: string;
  details?: any;
}

export const AdminAuditLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [chainVerification, setChainVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AdminDetailItem | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminAuditLogs({
        search,
        status: statusFilter,
        action: actionFilter,
        page,
        limit: 10,
      });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setChainVerification(data.chainVerification);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, statusFilter, actionFilter]);

  const handleRowClick = (log: AuditRecord) => {
    setSelectedLog({
      title: `Audit Entry // ${log.action}`,
      subtitle: `Log ID: ${log.id}`,
      badge: {
        text: log.status,
        color: log.status === 'SUCCESS' ? 'green' : 'red',
      },
      fields: [
        { label: 'Timestamp (UTC)', value: new Date(log.timestamp).toISOString() },
        { label: 'Executing User / Principal', value: log.user },
        { label: 'Action Tag', value: log.action },
        { label: 'Resource Target', value: log.resource },
        { label: 'Execution Result', value: log.status },
        { label: 'Correlation Request ID', value: log.requestId },
        { label: 'Client IP Address', value: log.ipAddress },
        { label: 'SHA-256 Hash Digest', value: log.currentHash ? `${log.currentHash.slice(0, 24)}...` : 'N/A' },
      ],
      rawJson: log.details,
    });
  };

  return (
    <div className="space-y-5 animate-fade-in font-sans text-slate-100">
      {/* Cryptographic Chain Integrity Card */}
      {chainVerification && (
        <div className="p-4 rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white flex items-center gap-1.5">
                <span>Tamper-Evident SHA-256 Cryptographic Hash Chain:</span>
                <span className="text-emerald-400 uppercase font-mono font-bold tracking-wider">
                  {chainVerification.chainValid ? 'VERIFIED VALID' : 'COMPROMISED'}
                </span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                Validated {chainVerification.totalBlocks} sequential cryptographic blocks without modification.
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 shrink-0">
            Head: <code className="text-[#00c4df]">{chainVerification.headHash ? chainVerification.headHash.slice(0, 12) : 'NONE'}...</code>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchAuditLogs(); }} className="flex-1 relative flex items-center max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by action, user ID, request ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          />
        </form>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILURE">FAILURE</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl bg-[#161e2e] border border-[#1a2536] text-xs text-slate-300 font-medium focus:outline-none focus:ring-1 focus:ring-[#00c4df]"
          >
            <option value="">All Actions</option>
            <option value="LOGIN">LOGIN</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="SEARCH">SEARCH</option>
            <option value="USER">USER</option>
            <option value="CAMERA">CAMERA</option>
            <option value="ADMIN">ADMIN</option>
          </select>

          <button
            type="button"
            onClick={fetchAuditLogs}
            title="Refresh Audit Logs"
            className="p-2 rounded-xl bg-[#161e2e] hover:bg-[#1e2a3f] border border-[#1a2536] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00c4df]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-2xl bg-[#0f1520] border border-[#1a2536] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00c4df]" />
            <p className="text-xs uppercase font-mono font-semibold">Loading cryptographic audit trail...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto" />
            <p className="text-xs font-bold font-mono">{error}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-1">
            <FileText className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs font-semibold text-slate-300">No audit events recorded.</p>
            <p className="text-[11px] text-slate-500">Security events and mutations will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#1a2536] bg-[#161e2e]/80 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Resource</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#141c2b]">
                {logs.map((l) => (
                  <tr 
                    key={l.id}
                    onClick={() => handleRowClick(l)}
                    className="hover:bg-[#161e2e]/50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(l.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {String(l.user).slice(0, 10)}...
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[#00c4df]">
                      {l.action}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {l.resource}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        l.status === 'SUCCESS'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                      {String(l.requestId).slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(l);
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
          <span>Total: <strong className="text-white">{total}</strong> audit logs</span>
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
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        data={selectedLog}
      />
    </div>
  );
};
