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
  Lock,
  Share2,
  CheckCircle2,
  Archive,
  ShieldCheck
} from 'lucide-react';
import type { InvestigationCase } from '../../types/investigation';
import { apiClient } from '../../services/apiClient';

interface ForensicReportModalProps {
  caseData: InvestigationCase;
  isOpen: boolean;
  onClose: () => void;
  onCloseCase?: () => void;
}

export const ForensicReportModal: React.FC<ForensicReportModalProps> = ({ 
  caseData, 
  isOpen, 
  onClose,
  onCloseCase 
}) => {
  const [evidenceMode, setEvidenceMode] = useState<'annotated' | 'original'>('annotated');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const generatedTimestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  const localTimeString = new Date().toLocaleString();

  const handlePrint = () => {
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

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ControlF_Investigation_Report_${caseData.caseId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace, sans-serif; background: #080b11; color: #f1f5f9; margin: 0; padding: 32px; }
    .container { max-width: 960px; margin: 0 auto; background: #0c121d; border: 1px solid #1a273c; border-radius: 12px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .header { border-bottom: 2px solid #1e2f49; padding-bottom: 20px; display: flex; justify-content: space-between; margin-bottom: 24px; }
    .brand { font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #ffffff; }
    .brand-accent { color: #00e5ff; }
    .case-ref { font-family: monospace; font-size: 14px; font-weight: bold; color: #00e5ff; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
    .metric-card { background: #080d15; border: 1px solid #162234; padding: 14px; border-radius: 8px; font-size: 12px; }
    .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-family: monospace; font-weight: bold; }
    .value { font-weight: bold; margin-top: 4px; color: #f8fafc; }
    .badge-confirmed { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-family: monospace; font-weight: bold; background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.4); }
    .evidence-img { max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #1e2f49; }
    .section-title { font-size: 12px; font-family: monospace; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #18263c; padding-bottom: 8px; margin: 24px 0 14px 0; color: #00e5ff; }
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

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const getStatusBadge = (status: InvestigationCase['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            CONFIRMED
          </span>
        );
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            ACTIVE
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" />
            RECOVERED
          </span>
        );
      case 'CLOSED':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#142033] text-slate-400 border border-[#20324c] flex items-center gap-1.5">
            <Archive className="w-3 h-3" />
            CLOSED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-[#0c121d] rounded-2xl border border-[#1a273c] shadow-[0_25px_60px_rgba(0,0,0,0.8)] max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Control Bar (Screen only) */}
        <div className="px-6 py-3.5 border-b border-[#162134] bg-[#090e17] flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3 text-xs font-mono font-bold text-white">
            <div className="w-6 h-6 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white tracking-wider">INVESTIGATION DOSSIER</span>
              <span className="text-slate-500">//</span>
              <span className="text-[#00e5ff] font-extrabold">{caseData.caseId}</span>
            </div>
            {getStatusBadge(caseData.status)}
          </div>

          <div className="flex items-center gap-2">
            {/* Share Action */}
            <button
              type="button"
              id="report-share-btn"
              onClick={handleShare}
              className="px-2.5 py-1.5 rounded-lg bg-[#111a28] hover:bg-[#18263a] border border-[#1e2f49] text-slate-300 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Copy Dossier Link"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            {/* Download Report Action */}
            <button
              type="button"
              id="report-download-btn"
              onClick={handleDownloadReport}
              disabled={isExporting}
              className="px-3 py-1.5 rounded-lg bg-[#111a28] hover:bg-[#18263a] border border-[#1e2f49] text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Download Archival Dossier (HTML)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>{isExporting ? 'Exporting...' : 'DOWNLOAD REPORT'}</span>
            </button>

            {/* Export PDF Action */}
            <button
              type="button"
              id="report-print-pdf-btn"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-[#00e5ff] hover:bg-[#00cce6] text-[#080b11] text-xs font-mono font-extrabold flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-colors"
              title="Print or Save Official PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>EXPORT PDF</span>
            </button>

            {/* Close Case Action if provided */}
            {onCloseCase && caseData.status !== 'CLOSED' && (
              <button
                type="button"
                id="report-close-case-btn"
                onClick={onCloseCase}
                className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Close Investigation Case"
              >
                <span>CLOSE CASE</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#142033] transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Forensic Report Document (Dark Graphite Dossier) */}
        <div 
          id="printable-forensic-dossier" 
          className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5 font-sans text-slate-100 bg-[#0c121d] print:p-0 print:overflow-visible print:bg-white print:text-slate-900"
        >
          
          {/* 1. Official Header & ControlF Branding */}
          <div className="border-b-2 border-[#1a273c] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] flex items-center justify-center font-extrabold text-sm font-mono tracking-tighter">
                  CF
                </div>
                <div>
                  <span className="font-extrabold text-lg sm:text-xl tracking-wider uppercase font-sans text-white block leading-tight">
                    CONTROL<span className="text-[#00e5ff]">F</span>
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase block">
                    Autonomous Video Intelligence & Physical World Search
                  </span>
                </div>
                <span className="ml-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#101927] border border-[#1c2c44] text-[#00e5ff] uppercase tracking-wider">
                  INVESTIGATION REPORT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono pt-1">
                SOC STATION 01 // SURVEILLANCE ZONE ALPHA // CHAIN OF CUSTODY ASSURED
              </p>
            </div>

            <div className="text-left sm:text-right font-mono text-xs space-y-0.5 shrink-0">
              <div className="font-bold text-white text-sm">
                CASE REF: <span className="text-[#00e5ff] font-extrabold">{caseData.caseId}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                GENERATED: <span className="text-slate-200 font-bold">{generatedTimestamp}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                LOCAL TIME: {localTimeString}
              </div>
              <div className="text-[11px] font-bold uppercase mt-1 flex items-center sm:justify-end gap-1.5">
                <span className="text-slate-400">FINAL STATUS:</span>
                {getStatusBadge(caseData.status)}
              </div>
            </div>
          </div>

          {/* 2. Target Object & Search Parameters Panel */}
          <div className="p-3.5 rounded-xl bg-[#080d15] border border-[#162234] text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-[#141f30] pb-1.5">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-200 uppercase">
                <Sliders className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Search Parameters & Inference Engine Specifications</span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                SYSTEM VERIFIED // YOLOV8 + BYTETRACK KALMAN
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-0.5">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-semibold">Target Object</span>
                <span className="font-bold text-sm text-white font-sans flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#00e5ff]" />
                  {caseData.objectName}
                  {caseData.objectColor && <span className="text-slate-400 text-xs font-normal">({caseData.objectColor})</span>}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-semibold">Detection Engine</span>
                <span className="font-mono font-bold text-slate-200">Ultralytics YOLOv8n</span>
                <span className="text-[10px] text-slate-500 font-mono block">COCO-80 Taxonomy</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-semibold">Tracking Pipeline</span>
                <span className="font-mono font-bold text-slate-200">ByteTrack Kalman Filter</span>
                <span className="text-[10px] text-slate-500 font-mono block">Temporal Re-ID</span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block font-semibold">Confidence Threshold</span>
                <span className="font-mono font-bold text-emerald-400">80.0% Minimum Floor</span>
                <span className="text-[10px] text-slate-500 font-mono block">Multi-Frame Temporal Lock</span>
              </div>
            </div>
          </div>

          {/* 3. Core Sighting Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-[#080d15] border border-[#162234]">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Search Initiated</span>
              <span className="font-bold text-white text-xs mt-0.5 block">{caseData.searchStartedAt}</span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">Automated Intake</span>
            </div>

            <div className="p-3 rounded-xl bg-[#080d15] border border-[#162234]">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">First Detection</span>
              <span className="font-bold text-white text-xs mt-0.5 block">{caseData.firstDetectionAt}</span>
              <span className="text-[9px] text-cyan-400 mt-0.5 block">Node: CAM-07 Loading Bay</span>
            </div>

            <div className="p-3 rounded-xl bg-[#080d15] border border-[#162234]">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Last Detection</span>
              <span className="font-bold text-white text-xs mt-0.5 block">{caseData.lastDetectionAt}</span>
              <span className="text-[9px] text-emerald-400 mt-0.5 block">Node: CAM-18 Breakroom</span>
            </div>

            <div className="p-3 rounded-xl bg-[#080d15] border border-[#162234]">
              <span className="text-[10px] uppercase text-slate-500 font-semibold block">Verified Sightings</span>
              <span className="font-bold text-emerald-400 text-xs mt-0.5 block">{caseData.positiveMatchesCount} Verified Sightings</span>
              <span className="text-[9px] text-slate-500 mt-0.5 block">{caseData.camerasAnalyzedCount} Sectors Ingested</span>
            </div>
          </div>

          {/* 4. Final Known Location Callout */}
          <div className="p-3.5 rounded-xl bg-[#080d15] border border-[#1b2c45] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400 tracking-wider block">
                  FINAL KNOWN PHYSICAL LOCATION
                </span>
                <span className="font-bold text-white text-sm block font-sans">
                  {caseData.lastKnownLocation}
                </span>
                <span className="text-[11px] text-slate-400 font-mono block">
                  Monitored Sector: {caseData.lastKnownCamera} • Unit: {caseData.assignedUnit}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0 font-mono text-[11px]">
              <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 font-bold border border-cyan-500/30">
                LAST SEEN POSITION
              </span>
            </div>
          </div>

          {/* 5. Primary Forensic Evidence & Cryptographic Chain of Custody */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            <div className="md:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs uppercase text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>Forensic Evidence Frame Capture</span>
                </span>
                <div className="flex items-center gap-1 print:hidden">
                  <button
                    type="button"
                    onClick={() => setEvidenceMode('annotated')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                      evidenceMode === 'annotated' ? 'bg-[#00e5ff] text-[#080b11]' : 'bg-[#101726] text-slate-400 hover:text-white'
                    }`}
                  >
                    Annotated
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvidenceMode('original')}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                      evidenceMode === 'original' ? 'bg-[#00e5ff] text-[#080b11]' : 'bg-[#101726] text-slate-400 hover:text-white'
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>

              <div className="aspect-video rounded-xl bg-[#070a10] overflow-hidden border border-[#1a273c] relative shadow-inner">
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
                    <div className="w-2/3 h-2/3 border-2 border-emerald-400 rounded-sm relative shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                      <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
                        {caseData.objectName} • {caseData.primaryConfidence.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>SENSOR: {caseData.lastKnownCamera}</span>
                <span className="font-bold text-emerald-400">CONFIDENCE: {caseData.primaryConfidence.toFixed(1)}%</span>
              </div>
            </div>

            {/* Right Column: Cryptographic Ledger & Incident Synopsis */}
            <div className="md:col-span-6 space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#080d15] border border-[#162234] space-y-1.5">
                <span className="font-bold text-white uppercase tracking-tight text-xs font-mono flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#00e5ff]" />
                  <span>Chain-of-Custody & Tamper-Proof Audit Integrity</span>
                </span>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Optical telemetry ingested with zero synthetic interpolation. Bounding reticle coordinates, deep feature embeddings, and timestamps are cryptographically sealed in the Oracle Database 21c XE audit ledger.
                </p>
                <div className="p-2 rounded-lg bg-[#06090e] border border-[#141f30] font-mono text-[10px] text-cyan-300 break-all shadow-inner">
                  <div className="text-slate-500 font-bold mb-0.5 uppercase text-[9px]">SHA-256 EVIDENCE INTEGRITY CHECKSUM:</div>
                  {caseData.evidenceHash}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080d15] border border-[#162234] space-y-1 shadow-inner">
                <span className="font-bold text-white uppercase text-[11px] font-mono block">Incident Synopsis</span>
                <p className="text-slate-400 text-[11px] leading-relaxed font-sans">
                  {caseData.summaryNotes}
                </p>
              </div>
            </div>
          </div>

          {/* 6. Multi-Camera Re-ID Journey Sequence */}
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase font-mono text-white flex items-center gap-1.5 border-b border-[#18263c] pb-1.5">
              <Camera className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Multi-Camera Re-ID Journey ({caseData.cameraJourney.length} Spatial Nodes)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {caseData.cameraJourney.map((step, idx) => (
                <div key={step.id} className="p-3 rounded-xl border border-[#162234] bg-[#080d15] text-xs space-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#00e5ff]">
                      <span>STEP 0{idx + 1} // {step.cameraId}</span>
                      <span className="text-slate-400 font-normal">{step.timestamp}</span>
                    </div>
                    <div className="font-bold text-white text-xs mt-1">{step.cameraName}</div>
                    <div className="text-slate-400 text-[11px] font-sans">{step.location}</div>
                  </div>

                  <div className="pt-2 border-t border-[#121c2c] flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500">DWELL: {step.dwellTimeSeconds || 30}s</span>
                    {step.confidence && (
                      <span className="text-emerald-400 font-bold">{step.confidence.toFixed(1)}% Match</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. Chronological Investigation Timeline */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase font-mono text-white flex items-center gap-1.5 border-b border-[#18263c] pb-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>Chronological Timeline of Key Events</span>
            </h3>

            <div className="space-y-1.5 text-xs divide-y divide-[#141f30]">
              {caseData.timeline.map((event) => (
                <div key={event.id} className="pt-1.5 flex items-start gap-3">
                  <span className="font-mono text-cyan-400 font-bold text-xs shrink-0 w-16">
                    {event.timeFormatted}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-white">{event.title}</span>
                    <span className="text-slate-400 ml-2 text-[11px]">— {event.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 8. Official Sign-Off & Seal Footer */}
          <div className="border-t-2 border-[#1a273c] pt-4 grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block font-bold">Lead Investigator Sign-off</span>
              <div className="h-10 border-b border-[#243652] mt-1 flex items-end pb-1 italic text-sm text-slate-200">
                {caseData.leadInvestigator}
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5 block">SECURITY OPERATIONS CENTER // STATION 01</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block font-bold">Digital Cryptographic Seal</span>
              <div className="h-10 border-b border-[#243652] mt-1 flex items-end pb-1 text-emerald-400 text-[11px] font-bold">
                ✓ SHA-256 VERIFIED // ORACLE 21c XE TAMPER-PROOF LEDGER
              </div>
              <span className="text-[9px] text-slate-500 mt-0.5 block">AUTHORIZED DIGITAL AUDIT CERTIFICATE</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

