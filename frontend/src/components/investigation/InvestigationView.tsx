import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Camera, 
  Tag, 
  FileText, 
  Maximize2, 
  ArrowLeft, 
  MessageSquare, 
  Archive,
  ArrowRight,
  Info,
  Send,
  Activity,
  X
} from 'lucide-react';
import type { 
  InvestigationCase, 
  InvestigationStatus 
} from '../../types/investigation';
import { investigationService } from '../../services/investigationService';
import { ForensicReportModal } from './ForensicReportModal';
import { useExperienceStore } from '../../store/useExperienceStore';
import { apiClient } from '../../services/apiClient';

interface InvestigationViewProps {
  initialCaseId?: string;
  onBack?: () => void;
}

type ActiveSection = 'overview' | 'evidence' | 'journey' | 'timeline' | 'notes' | 'activity';

export const InvestigationView: React.FC<InvestigationViewProps> = ({ initialCaseId, onBack }) => {
  const { 
    currentUser, 
    setActiveFeedTab, 
    setStage,
    activeInvestigationId
  } = useExperienceStore();

  const operatorName = currentUser?.fullName || currentUser?.username || 'Operator Chen';

  const caseIdToLoad = initialCaseId || activeInvestigationId || investigationService.getDefaultCaseId();
  const [caseData, setCaseData] = useState<InvestigationCase>(() => {
    return investigationService.getCase(caseIdToLoad) || investigationService.getCase('INV-2026-00421') || investigationService.getAllCases()[0];
  });

  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [showReportModal, setShowReportModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<'annotated' | 'original'>('annotated');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Trigger feedback banner
  const triggerSuccessMsg = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  // Actions
  const handleConfirmMatch = () => {
    const updated = investigationService.updateCaseStatus(
      caseData.caseId, 
      'CONFIRMED', 
      operatorName, 
      'Target match confirmed and verified by lead investigator.'
    );
    if (updated) {
      setCaseData(updated);
      triggerSuccessMsg('Target match confirmed. Status updated to CONFIRMED.');
      // Phase 6 Audit Log: detection confirmation
      apiClient.recordAuditEvent({
        action: 'DETECTION_CONFIRMED',
        resourceType: 'INVESTIGATION',
        resourceId: caseData.caseId,
        details: { object: caseData.objectName, status: 'CONFIRMED', operator: operatorName },
      });
    }
  };

  const handleRejectMatch = () => {
    const updated = investigationService.updateCaseStatus(
      caseData.caseId, 
      'ACTIVE', 
      operatorName, 
      'Candidate match rejected by investigator. Investigation remains ACTIVE.'
    );
    if (updated) {
      setCaseData(updated);
      triggerSuccessMsg('Match dismissed. Recorded in investigation audit log.');
      // Phase 6 Audit Log: detection rejection
      apiClient.recordAuditEvent({
        action: 'DETECTION_REJECTED',
        resourceType: 'INVESTIGATION',
        resourceId: caseData.caseId,
        details: { object: caseData.objectName, status: 'ACTIVE', operator: operatorName },
      });
    }
  };

  const handleMarkRecovered = () => {
    const updated = investigationService.updateCaseStatus(
      caseData.caseId, 
      'RECOVERED', 
      operatorName, 
      'Object custody restored. Stored in facilities secure intake locker.'
    );
    if (updated) {
      setCaseData(updated);
      triggerSuccessMsg('Object marked as RECOVERED.');
      // Phase 6 Audit Log: investigation closure
      apiClient.recordAuditEvent({
        action: 'INVESTIGATION_CLOSED',
        resourceType: 'INVESTIGATION',
        resourceId: caseData.caseId,
        details: { status: 'RECOVERED', object: caseData.objectName, operator: operatorName },
      });
    }
  };

  const handleCloseInvestigation = () => {
    const updated = investigationService.updateCaseStatus(
      caseData.caseId, 
      'CLOSED', 
      operatorName, 
      'Investigation concluded and docket closed.'
    );
    if (updated) {
      setCaseData(updated);
      triggerSuccessMsg('Investigation case closed.');
      // Phase 6 Audit Log: investigation closure
      apiClient.recordAuditEvent({
        action: 'INVESTIGATION_CLOSED',
        resourceType: 'INVESTIGATION',
        resourceId: caseData.caseId,
        details: { status: 'CLOSED', object: caseData.objectName, operator: operatorName },
      });
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    investigationService.addNote(caseData.caseId, newNoteContent, operatorName, 'Investigator');
    const updated = investigationService.getCase(caseData.caseId);
    if (updated) {
      setCaseData(updated);
      setNewNoteContent('');
      triggerSuccessMsg('Note appended to case docket.');
    }
  };

  const handleReturnToDashboard = () => {
    if (onBack) {
      onBack();
    } else {
      setActiveFeedTab('home');
      setStage('HOME');
    }
  };

  // Status Badge Helper
  const getStatusBadge = (status: InvestigationStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            ACTIVE
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            CONFIRMED
          </span>
        );
      case 'RECOVERED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            RECOVERED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs">
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            CLOSED
          </span>
        );
    }
  };

  return (
    <div className="w-full flex flex-col font-sans text-slate-800 animate-fade-in space-y-3 select-none pb-4">
      
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3 pt-0.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReturnToDashboard}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="Return to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-indigo-600 tracking-wider uppercase">
                INVESTIGATION
              </span>
              <span className="text-slate-300">/</span>
              <h1 className="text-base font-extrabold text-slate-900 font-mono tracking-tight">
                #{caseData.caseId}
              </h1>
              {getStatusBadge(caseData.status)}
            </div>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Object: <strong className="text-slate-900">{caseData.objectName}</strong></span>
              {caseData.objectColor && (
                <span className="text-slate-500 font-normal">({caseData.objectColor})</span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
          {caseData.status !== 'CONFIRMED' && caseData.status !== 'RECOVERED' && caseData.status !== 'CLOSED' && (
            <button
              type="button"
              id="inv-action-confirm"
              onClick={handleConfirmMatch}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Match</span>
            </button>
          )}

          {caseData.status === 'ACTIVE' && (
            <button
              type="button"
              id="inv-action-reject"
              onClick={handleRejectMatch}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Match</span>
            </button>
          )}

          {caseData.status !== 'RECOVERED' && caseData.status !== 'CLOSED' && (
            <button
              type="button"
              id="inv-action-recover"
              onClick={handleMarkRecovered}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mark Recovered</span>
            </button>
          )}

          {caseData.status !== 'CLOSED' && (
            <button
              type="button"
              id="inv-action-close"
              onClick={handleCloseInvestigation}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Close</span>
            </button>
          )}

          <button
            type="button"
            id="inv-action-generate-report"
            onClick={() => setShowReportModal(true)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="tracking-wide">GENERATE INVESTIGATION REPORT</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 2. Telemetry Quick Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Search Started</span>
          <span className="font-mono font-bold text-slate-900 mt-0.5 block">{caseData.searchStartedAt}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">First Detection</span>
          <span className="font-mono font-bold text-slate-900 mt-0.5 block">{caseData.firstDetectionAt}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Last Detection</span>
          <span className="font-mono font-bold text-slate-900 mt-0.5 block">{caseData.lastDetectionAt}</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Cameras Analyzed</span>
          <span className="font-mono font-bold text-indigo-700 mt-0.5 block">{caseData.camerasAnalyzedCount} Nodes</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Positive Matches</span>
          <span className="font-mono font-bold text-emerald-700 mt-0.5 block">{caseData.positiveMatchesCount} Sightings</span>
        </div>

        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Last Known Location</span>
          <span className="font-semibold text-slate-900 text-[11px] truncate mt-0.5 block font-sans">{caseData.lastKnownLocation}</span>
        </div>
      </div>

      {/* 3. Section Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50/60 p-1 rounded-xl text-xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('overview')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 ${
            activeSection === 'overview'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('evidence')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
            activeSection === 'evidence'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <span>Evidence</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {caseData.cameraJourney.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('journey')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeSection === 'journey'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Camera Journey</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-500/30 text-indigo-100">
            Flow
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('timeline')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
            activeSection === 'timeline'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Timeline</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {caseData.timeline.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('notes')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
            activeSection === 'notes'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Notes</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600">
            {caseData.notes.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('activity')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1 ${
            activeSection === 'activity'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Activity Log</span>
        </button>
      </div>

      {/* 4. Section Content Bodies */}
      
      {/* SECTION 1: OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 animate-fade-in text-xs">
          {/* Primary Evidence Frame Preview */}
          <div className="md:col-span-6 flex flex-col space-y-2">
            <div className="aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-200 shadow-inner relative group">
              <img 
                src={caseData.primaryEvidenceUrl} 
                alt={caseData.objectName} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                <div className="w-2/3 h-2/3 border-2 border-emerald-400/90 rounded-sm relative shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
                    {caseData.objectName} • {caseData.primaryConfidence.toFixed(1)}%
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(caseData.primaryEvidenceUrl)}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                title="Inspect Frame"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
              <span>PRIMARY EVIDENCE CAPTURE</span>
              <span>CONFIDENCE: {caseData.primaryConfidence.toFixed(1)}%</span>
            </div>
          </div>

          {/* Synopsis & Investigation Details */}
          <div className="md:col-span-6 flex flex-col justify-between space-y-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
              <h3 className="font-bold text-slate-900 font-sans text-xs uppercase flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                <span>Incident Synopsis</span>
              </h3>
              <p className="text-slate-600 leading-relaxed text-xs">
                {caseData.summaryNotes}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Last Known Camera</span>
                <span className="font-mono font-bold text-slate-900 text-xs truncate block mt-0.5">
                  {caseData.lastKnownCamera}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold block">Assigned Unit</span>
                <span className="font-bold text-slate-900 text-xs truncate block mt-0.5">
                  {caseData.assignedUnit}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-600 break-all">
              <span className="text-slate-400 uppercase font-bold block mb-0.5">SHA-256 Audit Integrity Hash:</span>
              {caseData.evidenceHash}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: EVIDENCE */}
      {activeSection === 'evidence' && (
        <div className="space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="font-mono text-slate-500 font-bold text-xs">
              CAPTURED SURVEILLANCE EVIDENCE FRAMES ({caseData.cameraJourney.length} ITEMS)
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEvidenceMode('annotated')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  evidenceMode === 'annotated' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Annotated
              </button>
              <button
                type="button"
                onClick={() => setEvidenceMode('original')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  evidenceMode === 'original' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Original
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {caseData.cameraJourney.map((item, idx) => (
              <div 
                key={item.id} 
                className="rounded-xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col justify-between group hover:border-indigo-300 transition-all"
              >
                <div className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setLightboxImage(item.evidenceFrameUrl)}>
                  <img 
                    src={item.evidenceFrameUrl} 
                    alt={item.cameraName} 
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  {evidenceMode === 'annotated' && item.boundingBox && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-3">
                      <div className="w-2/3 h-2/3 border-2 border-emerald-400 rounded-sm relative">
                        <span className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-mono text-[8px] font-bold px-1 uppercase">
                          MATCH • {item.confidence?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.2 rounded bg-black/70 text-[9px] font-mono text-white">
                    FRAME #{idx + 1} • {item.timeShort}
                  </span>
                </div>

                <div className="p-2.5 space-y-1">
                  <div className="font-mono font-bold text-slate-900 text-xs truncate">
                    {item.cameraName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate font-sans">
                    {item.location}
                  </div>
                  {item.transitionNote && (
                    <p className="text-[10px] text-slate-600 line-clamp-2 pt-1 font-sans">
                      {item.transitionNote}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 3: CAMERA JOURNEY (Cross-Camera Object Flow) */}
      {activeSection === 'journey' && (
        <div className="space-y-4 animate-fade-in text-xs">
          
          {/* Transparent Capability Banner (Prompt Compliance) */}
          <div className="p-3 rounded-xl bg-slate-100 border border-slate-200/90 flex items-start gap-2.5 text-xs text-slate-600">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 font-mono block uppercase text-[11px]">
                Multi-Camera ReID & Sequence Reconstruction Pipeline
              </span>
              <p className="text-[11px] leading-relaxed">
                Visualizing correlated spatial progression across surveillance nodes. Sequence timestamps and multi-camera transitions are calibrated through synchronized CCTV nodes.
              </p>
            </div>
          </div>

          {/* Stepper Flow: CAM-07 -> CAM-12 -> CAM-18 */}
          <div className="flex flex-col md:flex-row items-stretch justify-between gap-3">
            {caseData.cameraJourney.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex-1 p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5 flex flex-col justify-between">
                  <div>
                    {/* Step Badge & Camera ID */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="uppercase">{step.cameraId}</span>
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-slate-500">
                        {step.timestamp}
                      </span>
                    </div>

                    {/* Camera Location */}
                    <div className="mt-2 space-y-0.5">
                      <span className="font-bold text-slate-900 text-xs block font-mono">
                        {step.cameraName}
                      </span>
                      <span className="text-slate-500 text-[11px] block font-sans">
                        {step.location}
                      </span>
                    </div>

                    {/* Evidence Thumbnail */}
                    <div className="mt-2.5 aspect-video rounded-lg bg-slate-950 overflow-hidden relative group">
                      <img 
                        src={step.evidenceFrameUrl} 
                        alt={step.cameraName} 
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightboxImage(step.evidenceFrameUrl)}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {step.confidence && (
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-emerald-600 text-white font-mono text-[9px] font-bold">
                          {step.confidence.toFixed(1)}% Match
                        </div>
                      )}
                    </div>

                    {step.transitionNote && (
                      <p className="mt-2 text-[11px] text-slate-600 italic">
                        &ldquo;{step.transitionNote}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>DWELL: {step.dwellTimeSeconds || 30}s</span>
                    <span className="text-emerald-700 font-bold">CORRELATED</span>
                  </div>
                </div>

                {/* Arrow Divider between steps (Desktop: horizontal, Mobile: vertical) */}
                {idx < caseData.cameraJourney.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-slate-400 px-1">
                    <div className="flex flex-col items-center">
                      <ArrowRight className="w-5 h-5 text-indigo-500 stroke-[2.5]" />
                      <span className="text-[9px] font-mono text-slate-400 mt-1">TRANSIT</span>
                    </div>
                  </div>
                )}
                {idx < caseData.cameraJourney.length - 1 && (
                  <div className="flex md:hidden items-center justify-center text-slate-400 py-1">
                    <span className="text-xs font-mono text-indigo-600 font-bold">↓ TRANSIT AXIS</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: TIMELINE */}
      {activeSection === 'timeline' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-mono text-slate-900 font-bold text-xs uppercase">
              Chronological Investigation Timeline
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {caseData.timeline.length} Recorded Events
            </span>
          </div>

          <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {caseData.timeline.map((item) => (
              <div key={item.id} className="relative group">
                {/* Timeline Node Dot */}
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-white border-2 border-indigo-600 shadow-xs" />

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                  <span className="font-mono font-bold text-indigo-700 text-xs shrink-0 w-16">
                    {item.timeFormatted}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 font-sans text-xs">
                      {item.title}
                    </span>
                    <span className="text-slate-600 ml-2 font-sans">
                      — {item.description}
                    </span>
                    {item.camera && (
                      <span className="ml-2 font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {item.camera}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 5: NOTES */}
      {activeSection === 'notes' && (
        <div className="space-y-4 animate-fade-in text-xs">
          {/* Add Note Form */}
          <form onSubmit={handleAddNote} className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
            <label className="font-bold text-slate-900 uppercase text-[11px] font-mono block">
              Add Investigator Observation Note
            </label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter physical observations, suspect trajectory, or custody details..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Append Note</span>
              </button>
            </div>
          </form>

          {/* Notes History Ledger */}
          <div className="space-y-2.5">
            {caseData.notes.map((note) => (
              <div key={note.id} className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 font-sans">{note.author}</span>
                    <span className="text-slate-400 font-mono">•</span>
                    <span className="text-slate-500 font-mono text-[10px]">{note.authorRole}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[10px]">{note.timeFormatted}</span>
                </div>
                <p className="text-slate-700 text-xs leading-relaxed font-sans">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: ACTIVITY LOG */}
      {activeSection === 'activity' && (
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-mono text-slate-900 font-bold text-xs uppercase">
              Immutable Case Audit Trail
            </span>
            <span className="text-[10px] font-mono text-emerald-700 font-semibold">
              TAMPER-PROOF LEDGER
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {caseData.activityLog.map((act) => (
              <div key={act.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{act.action}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {act.category}
                    </span>
                  </div>
                  {act.details && (
                    <p className="text-[11px] text-slate-600 font-sans">{act.details}</p>
                  )}
                </div>

                <div className="text-right shrink-0 text-[10px] font-mono text-slate-400">
                  <div>{act.actor}</div>
                  <div>{act.timeFormatted}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Evidence Inspection */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <img src={lightboxImage} alt="Full evidence preview" className="w-full h-full object-contain" />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Forensic Report Printable Dossier Modal */}
      <ForensicReportModal 
        caseData={caseData}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />
    </div>
  );
};
