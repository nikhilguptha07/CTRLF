import React, { useState } from 'react';
import { 
  Search, 
  Calendar, 
  Clock, 
  Camera, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  Check
} from 'lucide-react';
import { useExperienceStore } from '../../store/useExperienceStore';
import type { DatePreset, TimeRangePreset, SearchParameters } from '../../types/searchWorkflow';

interface LostObjectFormProps {
  onSearchSubmit?: (query: string, source: 'CAMERA' | 'VIDEO' | 'ORCHESTRATOR') => void;
  autoAnimate?: boolean;
}

const QUICK_OBJECTS = [
  { label: 'Bottle', emoji: '🍾' },
  { label: 'Backpack', emoji: '🎒' },
  { label: 'Laptop', emoji: '💻' },
  { label: 'Person', emoji: '👤' },
  { label: 'Suitcase', emoji: '🧳' },
  { label: 'Cell Phone', emoji: '📱' },
];

const CAMERA_LOCATIONS = [
  { id: 'ALL', name: 'All Monitored Cameras', zone: 'Omni-Sweep • Sectors 1-4' },
  { id: 'CAM-01', name: 'CAM-01 (Overhead Sector A)', zone: 'Desk Surface Alpha' },
  { id: 'CAM-02', name: 'CAM-02 (Perimeter Corridor)', zone: 'West Transit Axis' },
  { id: 'CAM-03', name: 'CAM-03 (Conference Hall North)', zone: 'Meeting Hall Entrance' },
  { id: 'CAM-04', name: 'CAM-04 (Loading Dock West)', zone: 'Perimeter Gate Delta' },
];

export const LostObjectForm: React.FC<LostObjectFormProps> = ({ onSearchSubmit }) => {
  const {
    searchQuery,
    setSearchQuery,
    startSearchFlow,
    setActiveFeedTab,
    setStage,
    searchParameters,
    setSearchParameters,
  } = useExperienceStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const [objectText, setObjectText] = useState(searchQuery || searchParameters.object || 'Bottle');
  const [datePreset, setDatePreset] = useState<DatePreset>(searchParameters.datePreset || 'today');
  const [startDate, setStartDate] = useState(searchParameters.startDate || todayStr);
  const [endDate, setEndDate] = useState(searchParameters.endDate || todayStr);
  const [timePreset, setTimePreset] = useState<TimeRangePreset>(searchParameters.timeRangePreset || 'shift');
  const [startTime, setStartTime] = useState(searchParameters.startTime || '08:00');
  const [endTime, setEndTime] = useState(searchParameters.endTime || '18:00');
  const [selectedCamera, setSelectedCamera] = useState(searchParameters.cameraId || 'ALL');
  const [colorDescriptor, setColorDescriptor] = useState('');

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '24h') {
      const yesterday = new Date(now.getTime() - 24 * 3600 * 1000).toISOString().split('T')[0];
      setStartDate(yesterday);
      setEndDate(todayStr);
    } else if (preset === '3days') {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString().split('T')[0];
      setStartDate(threeDaysAgo);
      setEndDate(todayStr);
    }
  };

  const handleTimePresetChange = (preset: TimeRangePreset) => {
    setTimePreset(preset);
    if (preset === 'all') {
      setStartTime('00:00');
      setEndTime('23:59');
    } else if (preset === 'shift') {
      setStartTime('08:00');
      setEndTime('18:00');
    } else if (preset === 'morning') {
      setStartTime('06:00');
      setEndTime('12:00');
    } else if (preset === 'afternoon') {
      setStartTime('12:00');
      setEndTime('18:00');
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = objectText.trim() || 'Bottle';
    const finalQuery = colorDescriptor.trim() ? `${colorDescriptor.trim()} ${query}` : query;

    const chosenCam = CAMERA_LOCATIONS.find((c) => c.id === selectedCamera) || CAMERA_LOCATIONS[0];

    const updatedParams: SearchParameters = {
      object: finalQuery,
      datePreset,
      startDate,
      endDate,
      timeRangePreset: timePreset,
      startTime,
      endTime,
      cameraId: selectedCamera,
      location: chosenCam.zone,
    };

    setSearchParameters(updatedParams);
    setSearchQuery(finalQuery);

    if (onSearchSubmit) {
      onSearchSubmit(finalQuery, 'CAMERA');
    } else {
      startSearchFlow(finalQuery, 'CAMERA', selectedCamera === 'ALL' ? '1' : selectedCamera);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-sans text-slate-100 animate-fade-in pb-8">
      
      {/* 1. Header with Breadcrumb & Back Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-[#162032]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('home');
              setStage('HOME');
            }}
            className="p-1.5 rounded-lg bg-[#111722] border border-[#1f2b3e] text-slate-300 hover:text-white hover:bg-[#161e2e] transition-colors cursor-pointer"
            title="Return to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight font-sans flex items-center gap-2">
              <span>Find an Object</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00c4df]/10 border border-[#00c4df]/30 text-[#00c4df] font-mono font-semibold">
                OPTICAL SEARCH
              </span>
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Specify object attributes, temporal search window, and surveillance cameras to scan.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-right font-mono text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>ORACLE 21C READY</span>
        </div>
      </div>

      {/* 2. Main Search Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* FIELD 1: OBJECT SPECIFICATION */}
        <div className="p-4 rounded-xl bg-[#0f1520] border border-[#1a2536] space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="target-object-input" className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#00c4df]" />
              <span>1. Target Object Descriptor</span>
            </label>
            <span className="text-[10px] font-mono text-slate-400">REQUIRED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-8">
              <input
                id="target-object-input"
                type="text"
                value={objectText}
                onChange={(e) => setObjectText(e.target.value)}
                placeholder="Target object (e.g. Bottle, Backpack, Laptop, Person)..."
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d14] border border-[#1a2536] text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] transition-all font-sans"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                value={colorDescriptor}
                onChange={(e) => setColorDescriptor(e.target.value)}
                placeholder="Color / Attribute (e.g. Black, Red)..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#090d14] border border-[#1a2536] text-xs sm:text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00c4df] transition-all font-sans"
              />
            </div>
          </div>

          {/* Quick Target Chips */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[11px] font-mono text-slate-400">Quick Select:</span>
            {QUICK_OBJECTS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setObjectText(item.label)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  objectText.toLowerCase() === item.label.toLowerCase()
                    ? 'bg-[#00c4df] text-[#090d14] font-semibold'
                    : 'bg-[#161e2e] hover:bg-[#1c263a] text-slate-300 border border-[#1f2b3e]'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ROW: DATE RANGE & TIME RANGE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* FIELD 2: DATE / DATE RANGE */}
          <div className="p-4 rounded-xl bg-[#0f1520] border border-[#1a2536] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#00c4df]" />
                <span>2. Date Range</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">TEMPORAL</span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'today', label: 'Today' },
                { id: '24h', label: '24 Hours' },
                { id: '3days', label: '3 Days' },
                { id: 'custom', label: 'Custom' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleDatePresetChange(p.id as DatePreset)}
                  className={`py-1 text-[10px] font-mono font-semibold rounded border transition-colors cursor-pointer ${
                    datePreset === p.id
                      ? 'bg-[#00c4df]/15 border-[#00c4df]/40 text-[#00c4df]'
                      : 'bg-[#161e2e] border-[#1f2b3e] text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#090d14] border border-[#1a2536] text-xs font-mono text-slate-200 focus:outline-none focus:border-[#00c4df]"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">End Date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#090d14] border border-[#1a2536] text-xs font-mono text-slate-200 focus:outline-none focus:border-[#00c4df]"
                />
              </div>
            </div>
          </div>

          {/* FIELD 3: TIME RANGE */}
          <div className="p-4 rounded-xl bg-[#0f1520] border border-[#1a2536] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Time Range</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">WINDOW</span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'shift', label: 'Shift (08-18)' },
                { id: 'morning', label: 'Morning' },
                { id: 'afternoon', label: 'Afternoon' },
                { id: 'all', label: '24 Hours' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTimePresetChange(p.id as TimeRangePreset)}
                  className={`py-1 text-[10px] font-mono font-semibold rounded border transition-colors cursor-pointer ${
                    timePreset === p.id
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                      : 'bg-[#161e2e] border-[#1f2b3e] text-slate-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Time Pickers */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">From Time</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#090d14] border border-[#1a2536] text-xs font-mono text-slate-200 focus:outline-none focus:border-[#00c4df]"
                />
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">To Time</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setTimePreset('custom');
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#090d14] border border-[#1a2536] text-xs font-mono text-slate-200 focus:outline-none focus:border-[#00c4df]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FIELD 4: CAMERA / LOCATION SELECTION */}
        <div className="p-4 rounded-xl bg-[#0f1520] border border-[#1a2536] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 uppercase font-mono flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>4. Camera & Sector Target</span>
            </label>
            <span className="text-[10px] font-mono text-slate-400">SURVEILLANCE MESH</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {CAMERA_LOCATIONS.map((cam) => {
              const isSelected = selectedCamera === cam.id;
              return (
                <div
                  key={cam.id}
                  onClick={() => setSelectedCamera(cam.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#161e2e] border-[#00c4df] text-white shadow-xs'
                      : 'bg-[#090d14] hover:bg-[#161e2e] border-[#1a2536] text-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">
                      {cam.name}
                    </div>
                    <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-cyan-300' : 'text-slate-400'}`}>
                      {cam.zone}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-[#090d14] flex items-center justify-center shrink-0 ml-1.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* PRIMARY ACTION BUTTON: START SEARCH */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            <span>Scan Engine: </span>
            <span className="font-semibold text-white">YOLOv8 + ByteTrack Spatial Inference</span>
          </div>

          <button
            id="start-search-primary-btn"
            type="submit"
            className="w-full sm:w-auto px-8 py-2.5 rounded-lg bg-[#00c4df] hover:opacity-90 active:scale-98 text-[#090d14] font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 group uppercase tracking-wider"
          >
            <span>Begin Search</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </form>

    </div>
  );
};
