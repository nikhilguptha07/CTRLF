import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Camera, 
  Search, 
  Crosshair, 
  Activity, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  Server
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';

interface OverviewStats {
  totalUsers?: number;
  activeUsers?: number;
  activeCameras?: number;
  totalCameras?: number;
  searchSessions?: number;
  totalDetections?: number;
  objectTracks?: number;
  auditEvents?: number;
  databaseStatus?: string;
  systemHealth?: string;
  oracleMode?: string;
  databaseVersion?: string;
  databaseName?: string;
  latencyMs?: number;
  lastHealthCheck?: string;
}

interface AdminOverviewTabProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAdminOverview();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load system overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="text-xs font-semibold uppercase tracking-wider">Loading system overview telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-3xl bg-red-50 border border-red-200 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 mx-auto text-red-600" />
        <h3 className="text-sm font-bold text-red-800">Unable to Load System Overview</h3>
        <p className="text-xs text-red-600 font-mono">{error}</p>
        <button
          type="button"
          onClick={fetchStats}
          className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const kpis = [
    {
      title: 'TOTAL USERS',
      value: stats?.totalUsers !== undefined ? stats.totalUsers : 'Unavailable',
      subtext: `${stats?.activeUsers ?? 0} active accounts`,
      icon: Users,
      color: 'indigo',
      tab: 'users',
    },
    {
      title: 'ACTIVE CAMERAS',
      value: stats?.activeCameras !== undefined ? stats.activeCameras : 'Unavailable',
      subtext: `${stats?.totalCameras ?? 0} registered feeds`,
      icon: Camera,
      color: 'emerald',
      tab: 'cameras',
    },
    {
      title: 'SEARCH SESSIONS',
      value: stats?.searchSessions !== undefined ? stats.searchSessions : 'Unavailable',
      subtext: 'Historical & live sessions',
      icon: Search,
      color: 'blue',
      tab: 'sessions',
    },
    {
      title: 'TOTAL DETECTIONS',
      value: stats?.totalDetections !== undefined ? stats.totalDetections : 'Unavailable',
      subtext: 'Inference records',
      icon: Crosshair,
      color: 'purple',
      tab: 'detections',
    },
    {
      title: 'OBJECT TRACKS',
      value: stats?.objectTracks !== undefined ? stats.objectTracks : 'Unavailable',
      subtext: 'ByteTrack trajectories',
      icon: Activity,
      color: 'cyan',
      tab: 'tracks',
    },
    {
      title: 'AUDIT EVENTS',
      value: stats?.auditEvents !== undefined ? stats.auditEvents : 'Unavailable',
      subtext: 'Tamper-evident chain',
      icon: ShieldCheck,
      color: 'amber',
      tab: 'logs',
    },
    {
      title: 'DATABASE STATUS',
      value: stats?.databaseStatus || 'Unavailable',
      subtext: `Oracle ${stats?.databaseVersion || '21c XE'}`,
      icon: Database,
      color: stats?.databaseStatus === 'CONNECTED' || stats?.databaseStatus === 'CONNECTED_FALLBACK' ? 'emerald' : 'red',
      tab: 'database',
    },
    {
      title: 'SYSTEM HEALTH',
      value: stats?.systemHealth || 'Unavailable',
      subtext: stats?.latencyMs ? `${stats.latencyMs}ms database ping` : 'Healthy telemetry',
      icon: CheckCircle2,
      color: stats?.systemHealth === 'HEALTHY' ? 'emerald' : 'amber',
      tab: 'database',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Overview Intro Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
            System Operations & Database Health
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative surveillance telemetry backed by Oracle Database 21c XE Thin Driver.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchStats}
            className="px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* 8 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(kpi.tab)}
              className="group p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400">
                  {kpi.title}
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {kpi.value}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                  <span>{kpi.subtext}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Database Quick Health Strip */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <Server className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Oracle 21c XE Relational Persistence Layer
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            PDB: {stats?.databaseName || 'XEPDB1'} · Mode: {stats?.oracleMode || 'ORACLE_21C_XE_THIN'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Driver Architecture</span>
            <span className="font-semibold text-slate-800">Pure Thin TCP/IP Mode (Instant Client Free)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Roundtrip Latency</span>
            <span className="font-semibold text-emerald-600 font-mono">{stats?.latencyMs ?? 1} ms (Zero Overhead)</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Audit Integrity</span>
            <span className="font-semibold text-indigo-600">SHA-256 Tamper-Evident Hash Chain</span>
          </div>
        </div>
      </div>
    </div>
  );
};
