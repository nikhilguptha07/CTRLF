import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  CameraOff, 
  FileSearch, 
  HardDriveDownload,
  XCircle,
  ExternalLink
} from 'lucide-react';
import type { SecurityAlert } from '../../types/commandCenter';

interface SecurityAlertsPanelProps {
  alerts: SecurityAlert[];
  isLoading?: boolean;
  onAlertAction?: (alert: SecurityAlert) => void;
  onDismissAlert?: (alertId: string) => void;
}

export const SecurityAlertsPanel: React.FC<SecurityAlertsPanelProps> = ({
  alerts,
  isLoading = false,
  onAlertAction,
  onDismissAlert,
}) => {
  const activeAlerts = alerts.filter((a) => !a.resolved);

  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'CAMERA_OFFLINE':
        return <CameraOff className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'REVIEW_REQUIRED':
        return <FileSearch className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      case 'SYSTEM_WARNING':
        return <HardDriveDownload className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
    }
  };

  const getAlertStyle = (severity: SecurityAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-50/50 border-rose-200/90 text-rose-900';
      case 'warning':
        return 'bg-amber-50/50 border-amber-200/90 text-amber-900';
      case 'info':
      default:
        return 'bg-blue-50/40 border-blue-200/80 text-blue-950';
    }
  };

  return (
    <div className="rounded-xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h2 className="text-xs font-bold text-slate-900 tracking-tight font-sans uppercase">
            Operational Alerts
          </h2>
          {activeAlerts.length > 0 ? (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200">
              {activeAlerts.length} ATTENTION
            </span>
          ) : (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              NOMINAL
            </span>
          )}
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          AUTOMATIC MONITORING
        </span>
      </div>

      {/* Content */}
      <div className="p-2.5">
        {isLoading ? (
          <div className="space-y-2 py-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-2.5 rounded-lg bg-slate-100/70 animate-pulse h-16" />
            ))}
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/80 text-emerald-900">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-xs block font-sans">
                  All Systems Fully Nominal
                </span>
                <span className="text-[11px] text-emerald-700 font-mono block">
                  Zero active alarms. All surveillance streams & inference engines healthy.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              HEALTHY
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-2.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${getAlertStyle(alert.severity)}`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {getAlertIcon(alert.type)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs truncate font-sans">
                        {alert.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/70 border border-current/20 font-bold shrink-0">
                        {alert.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5 leading-snug line-clamp-2">
                      {alert.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 self-center">
                  {alert.actionLabel && onAlertAction && (
                    <button
                      type="button"
                      onClick={() => onAlertAction(alert)}
                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-300/80 text-[11px] font-semibold text-slate-800 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>{alert.actionLabel}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
                    </button>
                  )}
                  {onDismissAlert && (
                    <button
                      type="button"
                      onClick={() => onDismissAlert(alert.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                      title="Acknowledge alert"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
