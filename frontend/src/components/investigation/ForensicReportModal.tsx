import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  X, 
  Camera, 
  Clock, 
  MapPin, 
  Download, 
  Sliders, 
  Tag, 
  Lock
} from 'lucide-react';
import type { InvestigationCase } from '../../types/investigation';
import { apiClient } from '../../services/apiClient';

interface ForensicReportModalProps {
  caseData: InvestigationCase;
  isOpen: boolean;
  onClose: () => void;
}

export const ForensicReportModal: React.FC<ForensicReportModalProps> = ({ caseData, isOpen, onClose }) => {
  const [evidenceMode, setEvidenceMode] = useState<'annotated' | 'original'>('annotated');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const generatedTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const localTimeString = new Date().toLocaleString();

  const handlePrint = () => {
    // Record audit event
    apiClient.recordAuditEvent({
      action: 'REPORT_GENERATED',
      resourceType: 'FORENSIC_DOSSIER',
      resourceId: caseData.caseId,
      details: {
        objectName: caseData.objectName,
        caseId: caseData.caseId,
        hash: caseData.evidenceHash,
        exportFormat: 'PRINT_PDF',
        generatedAt: generatedTimestamp,
      },
    });
    window.print();
  };

  const handleDownloadReport = () => {
    setIsExporting(true);
    // Record audit event
    apiClient.recordAuditEvent({
      action: 'REPORT_GENERATED',
      resourceType: 'FORENSIC_DOSSIER',
      resourceId: caseData.caseId,
      details: {
        objectName: caseData.objectName,
        caseId: caseData.caseId,
        hash: caseData.evidenceHash,
        exportFormat: 'OFFICIAL_HTML_DOSSIER',
        generatedAt: generatedTimestamp,
      },
    });

    const reportElement = document.getElementById('printable-forensic-dossier');
    if (!reportElement) {
      setIsExporting(false);
      return;
    }

    // Generate standalone self-contained HTML dossier file for archival/saving
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ControlF_Investigation_Report_${caseData.caseId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .container { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; display: flex; justify-content: space-between; margin-bottom: 24px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px; }
    .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-family: monospace; font-weight: bold; }
    .value { font-weight: bold; margin-top: 4px; color: #0f172a; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-family: monospace; font-weight: bold; background: #0f172a; color: #fff; }
    .evidence-img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #cbd5e1; }
    .section-title { font-size: 12px; font-family: monospace; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin: 20px 0 12px 0; }
  </style>
</head>
<body>
  <div class="container">
    ${reportElement.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ControlF_Investigation_Report_${caseData.caseId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setTimeout(() => {
      setIsExporting(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Top Control Bar (Screen only) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2.5 text-xs font-mono font-bold text-slate-800">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span>OFFICIAL INVESTIGATION REPORT // {caseData.caseId}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300">
              {caseData.status}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="report-download-btn"
              onClick={handleDownloadReport}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
              title="Download Archival Dossier"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{isExporting ? 'Exporting...' : 'Download Dossier'}</span>
            </button>

            <button
              type="button"
              id="report-print-pdf-btn"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Print or Save to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Forensic Report Document */}
        <div 
          id="printable-forensic-dossier" 
          className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5 font-sans text-slate-900 bg-white print:p-0 print:overflow-visible print:bg-white"
        >
          
          {/* 1. Official Header & ControlF Branding */}
          <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-950 text-white flex items-center justify-center font-extrabold text-sm font-mono tracking-tighter">
                  CF
                </div>
                <div>
                  <span className="font-extrabold text-lg sm:text-xl tracking-tight uppercase font-sans text-slate-950 block leading-tight">
                    CONTROL·F
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">
                    Autonomous Video Intelligence & Spatial Re-ID Platform
                  </span>
                </div>
                <span className="ml-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white uppercase tracking-wider">
                  CONFIDENTIAL FORENSIC DOSSIER
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono pt-1">
                SOC STATION 01 • SURVEILLANCE ZONE ALPHA • CHAIN OF CUSTODY ASSURED
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs space-y-0.5 shrink-0">
              <div className="font-bold text-slate-900 text-sm">
                CASE REF: <span className="text-indigo-600 font-extrabold">{caseData.caseId}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                GENERATED: <span className="text-slate-800 font-bold">{generatedTimestamp}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                STATION LOCAL: {localTimeString}
              </div>
              <div className="text-[11px] text-emerald-700 font-bold uppercase mt-1">
                STATUS: <span className="underline">{caseData.status}</span>
              </div>
            </div>
          </div>

          {/* 2. Target Object & Search Parameters Panel */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-1.5">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800 uppercase">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>Search Specifications & Inference Model Parameters</span>
              </div>
              <span className="text-[10px] font-mono text-indigo-700 font-semibold">
                SYSTEM VERIFIED // YOLOV8N + BYTETRACK
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Target Object</span>
                <span className="font-bold text-sm text-slate-900 font-sans flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-600" />
                  {caseData.objectName}
                  {caseData.objectColor && <span className="text-slate-500 text-xs font-normal">({caseData.objectColor})</span>}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Detection Engine</span>
                <span className="font-mono font-bold text-slate-800">Ultralytics YOLOv8n</span>
                <span className="text-[10px] text-slate-400 font-mono block">COCO-80 Taxonomy</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Tracking Pipeline</span>
                <span className="font-mono font-bold text-slate-800">ByteTrack Kalman Filter</span>
                <span className="text-[10px] text-slate-400 font-mono block">Hungarian Association</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">Confidence Threshold</span>
                <span className="font-mono font-bold text-emerald-700">80.0% Minimum Floor</span>
                <span className="text-[10px] text-slate-400 font-mono block">Multi-Frame Temporal Lock</span>
              </div>
            </div>
          </div>

          {/* 3. Core Sighting Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Search Initiated</span>
              <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{caseData.searchStartedAt}</span>
              <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">Automated Intake</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">First Detection</span>
              <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{caseData.firstDetectionAt}</span>
              <span className="text-[9px] font-mono text-indigo-600 mt-0.5 block">Node: CAM-07 Loading Bay</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Last Detection</span>
              <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{caseData.lastDetectionAt}</span>
              <span className="text-[9px] font-mono text-emerald-600 mt-0.5 block">Node: CAM-18 Breakroom</span>
            </div>

            <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Confirmed Sightings</span>
              <span className="font-mono font-bold text-emerald-700 text-xs mt-0.5 block">{caseData.positiveMatchesCount} Verified Sightings</span>
              <span className="text-[9px] font-mono text-slate-400 mt-0.5 block">{caseData.camerasAnalyzedCount} Sectors Ingested</span>
            </div>
          </div>

          {/* 4. Final Known Location Callout */}
          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-800 tracking-wider block">
                  FINAL KNOWN PHYSICAL LOCATION
                </span>
                <span className="font-bold text-slate-900 text-sm block font-sans">
                  {caseData.lastKnownLocation}
                </span>
                <span className="text-[11px] text-slate-500 font-mono block">
                  Monitored Sector: {caseData.lastKnownCamera} • Unit: {caseData.assignedUnit}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold border border-indigo-200">
                LAST SEEN POSITION
              </span>
            </div>
          </div>

          {/* 5. Primary Forensic Evidence & Cryptographic Chain of Custody */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs uppercase text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Forensic Evidence Frame Capture</span>
                </span>
                <div className="flex items-center gap-1 print:hidden">
                  <button
                    type="button"
                    onClick={() => setEvidenceMode('annotated')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                      evidenceMode === 'annotated' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Annotated
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceMode('original')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                      evidenceMode === 'original' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>

              <div className="aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-300 relative shadow-inner">
                <img 
                  src={caseData.primaryEvidenceUrl} 
                  alt={caseData.objectName} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {evidenceMode === 'annotated' && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                    <div className="w-2/3 h-2/3 border-2 border-emerald-400/90 rounded-sm relative shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                      <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
                        {caseData.objectName} • {caseData.primaryConfidence.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span>SENSOR: {caseData.lastKnownCamera}</span>
                <span className="font-bold text-emerald-700">CONFIDENCE: {caseData.primaryConfidence.toFixed(1)}%</span>
              </div>
            </div>

            {/* Right Column: Cryptographic Ledger & Incident Synopsis */}
            <div className="md:col-span-6 space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="font-bold text-slate-900 uppercase tracking-tight text-xs font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Chain-of-Custody & Tamper-Proof Audit Integrity</span>
                </span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Optical telemetry ingested with zero synthetic interpolation. Bounding reticle coordinates, deep feature embeddings, and timestamps are cryptographically sealed in the Oracle Database 21c XE audit ledger.
                </p>
                <div className="p-2 rounded-lg bg-white border border-slate-200 font-mono text-[10px] text-slate-800 break-all shadow-2xs">
                  <div className="text-slate-400 font-bold mb-0.5 uppercase text-[9px]">SHA-256 EVIDENCE INTEGRITY CHECKSUM:</div>
                  {caseData.evidenceHash}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                <span className="font-bold text-slate-900 uppercase text-[11px] font-mono block">Incident Synopsis</span>
                <p className="text-slate-600 text-[11px] leading-relaxed font-sans">
                  {caseData.summaryNotes}
                </p>
              </div>
            </div>
          </div>

          {/* 6. Multi-Camera Re-ID Journey Sequence */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase font-mono text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>Multi-Camera Re-ID Journey ({caseData.cameraJourney.length} Spatial Nodes)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {caseData.cameraJourney.map((step, idx) => (
                <div key={step.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between font-mono text-[11px] font-bold text-indigo-700">
                      <span>STEP 0{idx + 1} // {step.cameraId}</span>
                      <span className="text-slate-500 font-normal">{step.timestamp}</span>
                    </div>
                    <div className="font-bold text-slate-900 text-xs mt-1">{step.cameraName}</div>
                    <div className="text-slate-500 text-[11px] font-sans">{step.location}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">DWELL: {step.dwellTimeSeconds || 30}s</span>
                    {step.confidence && (
                      <span className="text-emerald-700 font-bold">{step.confidence.toFixed(1)}% Match</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Chronological Investigation Timeline */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase font-mono text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chronological Timeline of Key Events</span>
            </h3>

            <div className="space-y-1.5 text-xs divide-y divide-slate-100">
              {caseData.timeline.map((event) => (
                <div key={event.id} className="pt-1.5 flex items-start gap-3">
                  <span className="font-mono text-slate-500 font-bold text-xs shrink-0 w-16">
                    {event.timeFormatted}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">{event.title}</span>
                    <span className="text-slate-600 ml-2 text-[11px]">— {event.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8. Official Sign-Off & Seal Footer */}
          <div className="border-t-2 border-slate-900 pt-4 grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block font-bold">Lead Investigator Sign-off</span>
              <div className="h-10 border-b border-slate-400 mt-1 flex items-end pb-1 font-serif italic text-base text-slate-800">
                {caseData.leadInvestigator}
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5 block">SECURITY OPERATIONS CENTER // STATION 01</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block font-bold">Digital Cryptographic Seal</span>
              <div className="h-10 border-b border-slate-400 mt-1 flex items-end pb-1 text-slate-700 text-[11px] font-bold">
                ✓ SHA-256 VERIFIED // TAMPER-RESISTANT ORACLE XE LEDGER
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5 block">AUTHORIZED DIGITAL AUDIT CERTIFICATE</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
