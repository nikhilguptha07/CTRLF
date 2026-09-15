import React from 'react';
import { 
  FileText, 
  Printer, 
  X, 
  Camera, 
  Clock
} from 'lucide-react';
import type { InvestigationCase } from '../../types/investigation';

interface ForensicReportModalProps {
  caseData: InvestigationCase;
  isOpen: boolean;
  onClose: () => void;
}

export const ForensicReportModal: React.FC<ForensicReportModalProps> = ({ caseData, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-sans">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Top Control Bar (Screen only) */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-700">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>FORENSIC DOSSIER // {caseData.caseId}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Export PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Forensic Report Document */}
        <div className="p-8 overflow-y-auto flex-1 space-y-6 font-sans text-slate-900 print:p-0">
          
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight uppercase">CONTROL·F</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white uppercase">
                  CONFIDENTIAL FORENSIC DOSSIER
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                PHYSICAL SURVEILLANCE & SPATIAL RE-IDENTIFICATION SYSTEM • SOC STATION 01
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs font-mono font-bold text-slate-900">
                CASE REF: <span className="text-indigo-600">{caseData.caseId}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                DATE: {new Date().toLocaleDateString()}
              </div>
              <div className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
                STATUS: {caseData.status}
              </div>
            </div>
          </div>

          {/* Core Metrics Summary Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Target Object</span>
              <span className="font-bold text-sm text-slate-900 font-sans">{caseData.objectName}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Search Started</span>
              <span className="font-mono font-bold text-slate-800">{caseData.searchStartedAt}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">First Detection</span>
              <span className="font-mono font-bold text-slate-800">{caseData.firstDetectionAt}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Last Detection</span>
              <span className="font-mono font-bold text-slate-800">{caseData.lastDetectionAt}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Cameras Analyzed</span>
              <span className="font-mono font-bold text-slate-800">{caseData.camerasAnalyzedCount} Monitored Sectors</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Positive Matches</span>
              <span className="font-mono font-bold text-emerald-700">{caseData.positiveMatchesCount} Verified Sightings</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Last Known Location</span>
              <span className="font-semibold text-slate-800">{caseData.lastKnownLocation}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-500 block">Lead Investigator</span>
              <span className="font-bold text-slate-900">{caseData.leadInvestigator}</span>
            </div>
          </div>

          {/* Primary Evidence & Chain of Custody */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            <div className="md:col-span-5 aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-300 relative shadow-inner">
              <img 
                src={caseData.primaryEvidenceUrl} 
                alt={caseData.objectName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div className="w-2/3 h-2/3 border-2 border-emerald-400/90 rounded-sm relative">
                  <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold px-1 py-0.2 uppercase">
                    {caseData.objectName} • {caseData.primaryConfidence.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-7 space-y-2 text-xs">
              <h3 className="font-bold text-slate-900 uppercase tracking-tight text-xs font-mono">
                Chain of Custody & Evidence Hash
              </h3>
              <p className="text-slate-600 text-xs">
                Optical telemetry validated under standard surveillance lighting. Subject features correlated against deep feature embeddings with {caseData.primaryConfidence.toFixed(1)}% match confidence.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700 break-all">
                <div className="text-slate-400 font-bold mb-0.5 uppercase">SHA-256 EVIDENCE INTEGRITY CHECKSUM:</div>
                {caseData.evidenceHash}
              </div>
            </div>
          </div>

          {/* Camera Journey Sequence */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase font-mono text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Camera className="w-3.5 h-3.5 text-indigo-600" />
              <span>Camera Journey Sequence ({caseData.cameraJourney.length} Nodes)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {caseData.cameraJourney.map((step, idx) => (
                <div key={step.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[11px] font-bold text-indigo-700">
                    <span>STEP 0{idx + 1}</span>
                    <span>{step.timeShort}</span>
                  </div>
                  <div className="font-bold text-slate-900 text-xs">{step.cameraName}</div>
                  <div className="text-slate-500 text-[11px]">{step.location}</div>
                  {step.confidence && (
                    <div className="text-[10px] font-mono text-emerald-700 font-bold pt-1">
                      {step.confidence.toFixed(1)}% Inference
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Chronological Timeline */}
          <div className="space-y-3">
            <h3 className="font-bold text-xs uppercase font-mono text-slate-900 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Chronological Event Progression</span>
            </h3>

            <div className="space-y-2 text-xs">
              {caseData.timeline.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <span className="font-mono text-slate-500 font-bold text-xs shrink-0 w-12">
                    {event.timeFormatted}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">{event.title}</span>
                    <span className="text-slate-600 ml-2">— {event.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Sign-Off Signature Footer */}
          <div className="border-t-2 border-slate-900 pt-4 grid grid-cols-2 gap-8 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Lead Investigator Signature</span>
              <div className="h-10 border-b border-slate-400 mt-2 flex items-end pb-1 font-serif italic text-base text-slate-800">
                {caseData.leadInvestigator}
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Security Authority Validation</span>
              <div className="h-10 border-b border-slate-400 mt-2 flex items-end pb-1 text-slate-600 text-[11px]">
                AUTHORIZED DIGITAL AUDIT SEAL // CONTROL-F SOC
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
