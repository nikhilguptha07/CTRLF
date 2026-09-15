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
    <div className="w-full max-w-3xl mx-auto flex flex-col justify-between py-2 select-none animate-fade-in font-sans text-slate-800 space-y-4">
      
      {/* 1. Header & Context */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveFeedTab('home');
              setStage('HOME');
            }}
            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
            title="Return to Command Center"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-sans flex items-center gap-2">
              <span>FIND AN OBJECT</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono font-bold">
                OPTICAL SWEEP
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Specify object attributes, temporal range, and surveillance cameras to scan.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-right font-mono text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>ORACLE 21C READY</span>
        </div>
      </div>

      {/* 2. Main Search Configuration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* FIELD 1: OBJECT SPECIFICATION */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="target-object-input" className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
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
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all font-sans"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                value={colorDescriptor}
                onChange={(e) => setColorDescriptor(e.target.value)}
                placeholder="Color / Attribute (e.g. Black, Red)..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 focus:bg-white transition-all font-sans"
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
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
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
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>2. Date / Date Range</span>
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
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* FIELD 3: TIME RANGE */}
          <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
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
                      ? 'bg-amber-50 border-amber-300 text-amber-800'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
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
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FIELD 4: CAMERA / LOCATION SELECTION */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 uppercase font-mono flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
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
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">
                      {cam.name}
                    </div>
                    <div className={`text-[10px] font-mono truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                      {cam.zone}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 ml-1.5">
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
          <div className="text-xs font-mono text-slate-500 hidden sm:block">
            <span>Scan Mode: </span>
            <span className="font-bold text-slate-800">YOLOv8 + ByteTrack Real-Time Inference</span>
          </div>

          <button
            id="start-search-primary-btn"
            type="submit"
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 group"
          >
            <span>START SEARCH</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </form>

    </div>
  );
};
