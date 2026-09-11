import React, { useEffect, useState } from 'react';
import { 
  Database, 
  Activity, 
  RefreshCw, 
  Table, 
  Trash2, 
  AlertTriangle,
  Server,
  CheckCircle2
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

interface TableStat {
  name: string;
  recordCount: number;
  description: string;
}

interface DatabaseMetadata {
  connectionStatus: string;
  databaseName: string;
  pdbService: string;
  serverStatus: string;
  databaseVersion: string;
  thinMode: boolean;
  lastHealthCheck: string;
  latencyMs: number;
  poolConfig: {
    poolMin: number;
    poolMax: number;
    poolIncrement: number;
    poolTimeout: number;
  };
  tables: TableStat[];
}

interface AdminDatabaseTabProps {
  onInspectTable: (tableName: string) => void;
}

export const AdminDatabaseTab: React.FC<AdminDatabaseTabProps> = ({ onInspectTable }) => {
  const [metadata, setMetadata] = useState<DatabaseMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeSuccessMessage, setPurgeSuccessMessage] = useState<string | null>(null);

  const fetchDatabaseInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminDatabase();
      setMetadata(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load database telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseInfo();
  }, []);

  const handlePurgeData = async () => {
    setIsPurging(true);
    setPurgeSuccessMessage(null);
    try {
      const res = await apiClient.clearDatabase();
      setPurgeSuccessMessage(`Database purged cleanly. ${res.recordsRemoved} operational records removed.`);
      setShowPurgeModal(false);
      await fetchDatabaseInfo();
    } catch (err: any) {
      alert(`Purge failed: ${err?.message || err}`);
    } finally {
      setIsPurging(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold uppercase tracking-wider">Inspecting Oracle 21c XE schema & pool metrics...</span>
      </div>
    );
  }

  if (error || !metadata) {
    return (
      <div className="p-8 rounded-3xl bg-red-50 border border-red-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-red-600" />
        <h3 className="text-sm font-bold text-red-800">Database Connection Error</h3>
        <p className="text-xs text-red-600 font-mono">{error || 'Unknown error'}</p>
        <button
          type="button"
          onClick={fetchDatabaseInfo}
          className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
        >
          Retry Connection Check
        </button>
      </div>
    );
  }

  const isConnected = metadata.connectionStatus === 'CONNECTED' || metadata.connectionStatus === 'CONNECTED_FALLBACK';

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Purge Notification Banner if recently purged */}
      {purgeSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{purgeSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setPurgeSuccessMessage(null)}
            className="text-emerald-600 hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Banner Card: Oracle 21c XE Telemetry */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Oracle 21c XE
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border ${
                  isConnected 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                  {metadata.connectionStatus}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Relational Intelligence, Multi-Tenant Pluggable Database (PDB) & Forensic Tracking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchDatabaseInfo}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ping Status</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Operational Data</span>
            </button>
          </div>
        </div>

        {/* Database Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
              Database Version
            </span>
            <span className="text-sm font-black text-slate-900 block font-mono">
              {metadata.databaseVersion}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
              PDB / Service
            </span>
            <span className="text-sm font-black text-slate-900 block font-mono">
              {metadata.pdbService}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
              Server Status
            </span>
            <span className="text-sm font-black text-emerald-600 block font-mono">
              {metadata.serverStatus}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 block">
              Roundtrip Latency
            </span>
            <span className="text-sm font-black text-indigo-600 block font-mono flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" />
              {metadata.latencyMs} ms
            </span>
          </div>
        </div>

        {/* Connection Pool Telemetry Details */}
        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-700">
            <span className="flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              Oracle Thin-Mode Connection Pool Configuration
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              Last Health Ping: {new Date(metadata.lastHealthCheck).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-600 pt-1">
            <div>Pool Min: <strong className="text-slate-900 font-mono">{metadata.poolConfig.poolMin}</strong></div>
            <div>Pool Max: <strong className="text-slate-900 font-mono">{metadata.poolConfig.poolMax}</strong></div>
            <div>Increment: <strong className="text-slate-900 font-mono">{metadata.poolConfig.poolIncrement}</strong></div>
            <div>Timeout: <strong className="text-slate-900 font-mono">{metadata.poolConfig.poolTimeout}s</strong></div>
          </div>
        </div>
      </div>

      {/* Table Row Statistics & Approved Table Browser Section */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Table className="w-4 h-4 text-indigo-600" />
              Approved Application Schema Tables ({metadata.tables.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any table to inspect live records in the Table Explorer.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {metadata.tables.map((tbl) => (
            <div
              key={tbl.name}
              onClick={() => onInspectTable(tbl.name)}
              className="group p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-indigo-400 hover:bg-indigo-50/20 transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-xs text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {tbl.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 font-mono">
                    {tbl.recordCount} rows
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                  {tbl.description}
                </p>
              </div>

              <span className="text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Explore &rarr;
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal for Purge */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Confirm Purge of Operational Data?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This administrative action clears test search sessions, detection records, and video artifacts. Core accounts and registered cameras will be preserved.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isPurging}
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={handlePurgeData}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isPurging && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
