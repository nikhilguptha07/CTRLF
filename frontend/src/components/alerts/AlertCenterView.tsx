import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  CameraOff, 
  FileSearch, 
  Bell, 
  Check, 
  Clock, 
  ExternalLink 
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useExperienceStore } from '../../store/useExperienceStore';
import { EmptyState } from '../ui/UnifiedStates';

export interface AlertCenterItem {
  id: string;
  type: 'CAMERA_OFFLINE' | 'REVIEW_REQUIRED' | 'MATCH_CONFIRMED' | 'PROCESSING_FAILED' | 'STORAGE_WARNING';
  title: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
  timeRelative: string;
  source: string;
  description: string;
  actionLabel: string;
  actionRoute: string;
  resolved: boolean;
}

const INITIAL_ALERTS: AlertCenterItem[] = [
  {
    id: 'alt-1',
    type: 'CAMERA_OFFLINE',
    title: 'Camera Offline // CAM-04 Connection Dropped',
    severity: 'critical',
    timestamp: '2026-09-15 14:38:12 UTC',
    timeRelative: '3m ago',
    source: 'CAM-04 (Perimeter West Portal)',
    description: 'RTSP video stream unreachable. Heartbeat failed 3 consecutive times on RTSP:8554. Automated retry daemon engaged.',
    actionLabel: 'Inspect Camera',
    actionRoute: 'cameras',
    resolved: false,
  },
  {
    id: 'alt-2',
    type: 'REVIEW_REQUIRED',
    title: 'Detection Requires Review // Candidate Ambiguity',
    severity: 'warning',
    timestamp: '2026-09-15 14:32:45 UTC',
    timeRelative: '8m ago',
    source: 'Inference Engine // CAM-07',
    description: 'Object candidate detected on CAM-07 with 88.4% confidence rating. Human supervisor review requested before target locking.',
    actionLabel: 'Review Candidate',
    actionRoute: 'search',
    resolved: false,
  },
  {
    id: 'alt-3',
    type: 'MATCH_CONFIRMED',
    title: 'Object Match Confirmed // Target Locked',
    severity: 'info',
    timestamp: '2026-09-15 14:26:30 UTC',
    timeRelative: '15m ago',
    source: 'Investigation INV-2026-00421',
    description: 'Correlated match across CAM-07, CAM-12, and CAM-18 approved by Operator Chen. Target identified at Loading Dock West.',
    actionLabel: 'View Dossier',
    actionRoute: 'investigation',
    resolved: false,
  },
  {
    id: 'alt-4',
    type: 'PROCESSING_FAILED',
    title: 'Processing Failed // Corrupt GOP Frame Chunk',
    severity: 'critical',
    timestamp: '2026-09-15 14:18:05 UTC',
    timeRelative: '23m ago',
    source: 'Batch Worker #2 (Optical Pipeline)',
    description: 'Neural optical feature extraction encountered corrupted keyframe chunk at frame offset 4028. Chunk re-queued with fallback decoder.',
    actionLabel: 'Check Health',
    actionRoute: 'overview',
    resolved: false,
  },
  {
    id: 'alt-5',
    type: 'STORAGE_WARNING',
    title: 'Storage Warning // Volume Capacity at 84%',
    severity: 'warning',
    timestamp: '2026-09-15 13:50:22 UTC',
    timeRelative: '51m ago',
    source: 'Storage Controller // NVMe-Pool-0',
    description: 'Primary forensic recording partition is approaching capacity threshold (84% of 2.0 TB used). Retention auto-purge will trigger if >90%.',
    actionLabel: 'Retention Policy',
    actionRoute: 'settings',
    resolved: false,
  },
];

export const AlertCenterView: React.FC = () => {
  const { setActiveFeedTab, setStage, currentUser } = useExperienceStore();
  const [alerts, setAlerts] = useState<AlertCenterItem[]>(INITIAL_ALERTS);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [showResolved, setShowResolved] = useState(false);

  // Sync with API if live
  useEffect(() => {
    let mounted = true;
    const fetchLiveAlerts = async () => {
      try {
        const live = await apiClient.getAlerts();
        if (mounted && live && live.length > 0) {
          const mapped: AlertCenterItem[] = live.map((item: any) => ({
            id: item.id,
            type: item.type,
            title: item.type.replace(/_/g, ' '),
            severity: item.severity,
            timestamp: item.timestamp,
            timeRelative: 'Recent',
            source: item.source,
            description: item.description,
            actionLabel: item.actionLabel || 'Inspect',
            actionRoute: item.actionRoute || 'overview',
            resolved: Boolean(item.resolved),
          }));
          setAlerts(mapped);
        }
      } catch {
        // Keep initial enterprise set
      }
    };
    fetchLiveAlerts();
    return () => { mounted = false; };
  }, []);

  const handleAcknowledge = async (alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, resolved: true } : a))
    );
    await apiClient.acknowledgeAlert(alertId).catch(() => {});
    await apiClient.recordAuditEvent({
      action: 'ALERT_RESOLVED',
      resourceType: 'ALERT',
      resourceId: alertId,
      details: { operator: currentUser?.email || 'Operator' },
    });
  };

  const handleActionClick = (route: string) => {
    if (route === 'cameras') {
      setActiveFeedTab('cctv');
      setStage('HOME');
    } else if (route === 'search') {
      setActiveFeedTab('search');
      setStage('OBJECT_INPUT');
    } else if (route === 'investigation') {
      setActiveFeedTab('investigation');
      setStage('HOME');
    } else if (route === 'settings') {
      setActiveFeedTab('settings');
      setStage('HOME');
    } else {
      setActiveFeedTab('home');
      setStage('HOME');
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!showResolved && a.resolved) return false;
    if (severityFilter !== 'ALL' && a.severity.toUpperCase() !== severityFilter) return false;
    return true;
  });

  const getSeverityStyle = (severity: AlertCenterItem['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-[#0f1520] border-rose-500/30 text-rose-300',
          badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: <CameraOff className="w-4 h-4 text-rose-400 shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-[#0f1520] border-amber-500/30 text-amber-300',
          badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case 'info':
        return {
          bg: 'bg-[#0f1520] border-[#00c4df]/30 text-slate-300',
          badge: 'bg-[#00c4df]/10 text-[#00c4df] border-[#00c4df]/20',
          icon: <FileSearch className="w-4 h-4 text-[#00c4df] shrink-0" />,
        };
      default:
        return {
          bg: 'bg-[#0f1520] border-[#1a2536] text-slate-300',
          badge: 'bg-[#161e2e] text-slate-400 border-[#1a2536]',
          icon: <Bell className="w-4 h-4 text-slate-400 shrink-0" />,
        };
    }
  };

  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => !a.resolved && a.severity === 'warning').length;
  const infoCount = alerts.filter((a) => !a.resolved && a.severity === 'info').length;

  return (
    <div className="w-full h-full flex flex-col space-y-4 overflow-y-auto pr-1 animate-fade-in text-slate-100">
      
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1a2536]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shadow-xs">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-sans">
                Alert Center & Incident Log
              </h1>
              {criticalCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
                  {criticalCount} CRITICAL
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ALL RESOLVED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-sans">
              Operational alarms, hardware heartbeats, neural inference reviews, and storage telemetry.
            </p>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => {
            const count =
              sev === 'CRITICAL' ? criticalCount : sev === 'WARNING' ? warningCount : sev === 'INFO' ? infoCount : alerts.filter((a) => !a.resolved).length;
            return (
              <button
                key={sev}
                type="button"
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  severityFilter === sev
                    ? 'bg-[#00c4df] text-slate-950 shadow-xs'
                    : 'bg-[#161e2e] text-slate-300 hover:bg-[#1a2536] border border-[#1a2536]'
                }`}
              >
                <span>{sev}</span>
                <span className={`px-1 rounded text-[9px] ${
                  severityFilter === sev ? 'bg-slate-950/20 text-slate-950' : 'bg-[#0f1520] text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setShowResolved(!showResolved)}
            className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer border ${
              showResolved
                ? 'bg-[#00c4df] text-slate-950 border-[#00c4df]'
                : 'bg-[#161e2e] text-slate-400 border-[#1a2536] hover:bg-[#1a2536]'
            }`}
          >
            {showResolved ? 'Hide Resolved' : 'Show All'}
          </button>
        </div>
      </div>

      {/* 2. Operational Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const style = getSeverityStyle(alert.severity);

          return (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs ${
                style.bg
              } ${alert.resolved ? 'opacity-60 grayscale-30' : ''}`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-1.5 rounded-lg bg-[#161e2e] border border-[#1a2536] shadow-2xs mt-0.5">
                  {style.icon}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-white font-sans">
                      {alert.title}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border uppercase ${style.badge}`}>
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {alert.timestamp} ({alert.timeRelative})
                    </span>
                  </div>

                  <div className="text-[11px] font-mono font-bold text-slate-400">
                    Source: <span className="text-[#00c4df]">{alert.source}</span>
                  </div>

                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {alert.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {!alert.resolved && (
                  <button
                    type="button"
                    onClick={() => handleAcknowledge(alert.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#161e2e] hover:bg-[#1a2536] border border-[#1a2536] text-slate-200 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer active:scale-95"
                    title="Acknowledge and mark resolved"
                  >
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Acknowledge</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleActionClick(alert.actionRoute)}
                  className="px-3 py-1.5 rounded-lg bg-[#00c4df] hover:bg-[#00d8f6] text-slate-950 font-bold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer active:scale-95"
                >
                  <span>{alert.actionLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="py-12">
            <EmptyState
              icon={Bell}
              title="No Security Incidents or Alarms"
              description="All hardware sensors, neural pipelines, and storage gateways operating within nominal parameters."
              actionLabel="Clear Filter Criteria"
              onAction={() => {
                setSeverityFilter('ALL');
                setShowResolved(true);
              }}
            />
          </div>
        )}
      </div>

    </div>
  );
};
