import React, { useState } from 'react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  Tag, 
  Maximize2, 
  ShieldCheck, 
  AlertCircle,
  RotateCcw,
  Check,
  X,
  FolderSearch
} from 'lucide-react';
import type { HumanVerificationState, VerificationReason } from '../../types/searchWorkflow';

interface DetectionVerificationCardProps {
  camera: string;
  location: string;
  object: string;
  confidence: number;
  timestamp: string;
  evidenceUrl?: string;
  originalUrl?: string;
  trackId?: number | string | null;
  verificationState: HumanVerificationState;
  onConfirm: () => void;
  onReject: (reason: VerificationReason, notes?: string) => void;
  onReset?: () => void;
  onInspectEvidence?: () => void;
  onOpenInvestigation?: () => void;
}

const REASON_OPTIONS: { id: VerificationReason; label: string; desc: string }[] = [
  { id: 'WRONG_OBJECT', label: 'Wrong Object', desc: 'Identified a different item entirely.' },
  { id: 'POOR_IMAGE', label: 'Poor Image', desc: 'Blur, glare, or severe occlusion prevents verification.' },
  { id: 'WRONG_LOCATION', label: 'Wrong Location', desc: 'Candidate located in wrong physical zone.' },
  { id: 'FALSE_DETECTION', label: 'False Detection', desc: 'Background artifact, shadow, or phantom detection.' },
  { id: 'OTHER', label: 'Other', desc: 'Other anomaly or edge case requiring operator note.' },
];

export const DetectionVerificationCard: React.FC<DetectionVerificationCardProps> = ({
  camera,
  location,
  object,
  confidence,
  timestamp,
  evidenceUrl,
  originalUrl,
  trackId,
  verificationState,
  onConfirm,
  onReject,
  onReset,
  onInspectEvidence,
  onOpenInvestigation,
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<VerificationReason>('WRONG_OBJECT');
  const [rejectNotes, setRejectNotes] = useState('');
  const [displayMode, setDisplayMode] = useState<'annotated' | 'original'>('annotated');

  const currentImgUrl = displayMode === 'annotated' ? (evidenceUrl || originalUrl) : (originalUrl || evidenceUrl);

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onReject(selectedReason, rejectNotes);
    setShowRejectForm(false);
  };

  return (
    <div className="w-full rounded-2xl bg-white/98 backdrop-blur-xl border border-slate-200 shadow-2xl overflow-hidden font-sans text-slate-800 animate-scale-in">
      
      {/* Top Telemetry Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span className="font-mono text-xs font-bold text-slate-800 uppercase tracking-wide">
            CCTV Target Identification
          </span>
          {trackId && (
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 font-bold">
              TRACK #{trackId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400 text-[10px]">INFERENCE SCORE:</span>
          <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
            {confidence ? confidence.toFixed(1) : '94.5'}%
          </span>
        </div>
      </div>

      {/* Main Forensic Display Body */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Left Column: Evidence Frame */}
        <div className="md:col-span-6 flex flex-col space-y-2.5">
          <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-200 shadow-inner group">
            {currentImgUrl ? (
              <img 
                src={currentImgUrl} 
                alt={object} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}

            {/* Bounding Box Reticle Overlay Placeholder if no image */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              <div className="w-2/3 h-2/3 border-2 border-emerald-400/90 rounded-sm relative shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <div className="absolute top-0 left-0 bg-emerald-500 text-slate-950 font-mono text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wider">
                  {object} • {confidence ? Math.round(confidence) : 95}%
                </div>
              </div>
            </div>

            {/* Image Mode Switcher */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
              <button
                type="button"
                onClick={() => setDisplayMode('annotated')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  displayMode === 'annotated'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-black/60 text-slate-300 hover:bg-black/80'
                }`}
              >
                Annotated
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('original')}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                  displayMode === 'original'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-black/60 text-slate-300 hover:bg-black/80'
                }`}
              >
                Original
              </button>
            </div>

            {/* Fullscreen Inspector Button */}
            {onInspectEvidence && (
              <button
                type="button"
                onClick={onInspectEvidence}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors cursor-pointer"
                title="Inspect Full Resolution"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>EVIDENCE FILE // SHA-256 HASHED</span>
            <span>FRAME: 1080p @ 30 FPS</span>
          </div>
        </div>

        {/* Right Column: Informative Metadata & Verification */}
        <div className="md:col-span-6 flex flex-col justify-between space-y-4">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-0.5 flex items-center gap-1">
                <Tag className="w-3 h-3 text-indigo-600" />
                <span>Object</span>
              </span>
              <span className="font-bold text-slate-900 text-sm truncate block font-sans">
                {object}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-0.5 flex items-center gap-1">
                <Camera className="w-3 h-3 text-emerald-600" />
                <span>Camera</span>
              </span>
              <span className="font-bold text-slate-900 text-xs truncate block font-mono">
                {camera}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-blue-600" />
                <span>Location</span>
              </span>
              <span className="font-semibold text-slate-800 text-xs truncate block font-sans">
                {location}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[10px] uppercase font-mono font-semibold text-slate-400 block mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Timestamp</span>
              </span>
              <span className="font-mono font-bold text-slate-800 text-xs truncate block">
                {timestamp}
              </span>
            </div>
          </div>

          {/* HUMAN VERIFICATION INTERACTIVE SECTION */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
            
            {/* PENDING VERIFICATION STATE */}
            {verificationState.status === 'PENDING' && !showRejectForm && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 font-sans">
                    Is this the correct object?
                  </span>
                  <span className="text-[10px] font-mono text-indigo-600 font-semibold">
                    HUMAN-IN-THE-LOOP
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    id="confirm-match-btn"
                    onClick={onConfirm}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>CONFIRM MATCH</span>
                  </button>

                  <button
                    type="button"
                    id="incorrect-match-btn"
                    onClick={() => setShowRejectForm(true)}
                    className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 active:scale-98 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>INCORRECT MATCH</span>
                  </button>
                </div>
              </div>
            )}

            {/* REJECT FEEDBACK REASON FORM */}
            {showRejectForm && verificationState.status === 'PENDING' && (
              <form onSubmit={handleRejectSubmit} className="space-y-2.5 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">
                    Specify Reason for Incorrect Match:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="text-slate-400 hover:text-slate-700 text-[11px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {REASON_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedReason(opt.id)}
                      className={`p-1.5 text-left rounded border transition-colors cursor-pointer ${
                        selectedReason === opt.id
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{opt.label}</div>
                      <div className="text-[9px] text-slate-400 font-mono truncate">{opt.desc}</div>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder="Optional operator notes or corrections..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />

                <button
                  type="submit"
                  id="submit-rejection-btn"
                  className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Submit Feedback & Continue Scan
                </button>
              </form>
            )}

            {/* CONFIRMED STATE */}
            {verificationState.status === 'CONFIRMED' && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex flex-col gap-2.5 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-emerald-950 block">
                        Target Match Verified by Human Operator
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700 block">
                        Verified at {verificationState.verifiedAt ? new Date(verificationState.verifiedAt).toLocaleTimeString() : 'Just now'} • Signed by {verificationState.operator || 'Operator'}
                      </span>
                    </div>
                  </div>
                  {onReset && (
                    <button
                      type="button"
                      onClick={onReset}
                      className="p-1 rounded text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                      title="Change verification"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {onOpenInvestigation && (
                  <button
                    type="button"
                    id="card-open-investigation-btn"
                    onClick={onOpenInvestigation}
                    className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <FolderSearch className="w-3.5 h-3.5" />
                    <span>Open Full Investigation Case Docket &rarr;</span>
                  </button>
                )}
              </div>
            )}

            {/* REJECTED STATE */}
            {verificationState.status === 'REJECTED' && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs text-rose-950 block">
                      Dismissed: {verificationState.reason?.replace('_', ' ') || 'Incorrect Match'}
                    </span>
                    <span className="text-[10px] font-mono text-rose-700 block">
                      {verificationState.notes || 'Recorded in surveillance audit ledger.'}
                    </span>
                  </div>
                </div>
                {onReset && (
                  <button
                    type="button"
                    onClick={onReset}
                    className="p-1 rounded text-rose-700 hover:text-rose-900 hover:bg-rose-100/60 transition-colors cursor-pointer"
                    title="Change verification"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
