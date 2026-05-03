'use client';

import { useState } from 'react';
import { Settings, ChevronRight, Check } from 'lucide-react';
import type { QualityLevel } from './useVideoPlayer';

interface SettingsMenuProps {
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  qualities: QualityLevel[];
  currentQuality: QualityLevel | null;
  onQualityChange: (q: QualityLevel) => void;
  hlsQualities: { height: number; label: string }[];
  currentHlsQuality: number;
  onHlsQualityChange: (index: number) => void;
}

const SPEED_OPTIONS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: 'Normal' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 1.75, label: '1.75x' },
  { value: 2, label: '2x' },
];

type MenuView = 'main' | 'speed' | 'quality';

export default function SettingsMenu({
  playbackSpeed,
  onSpeedChange,
  qualities,
  currentQuality,
  onQualityChange,
  hlsQualities,
  currentHlsQuality,
  onHlsQualityChange,
}: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<MenuView>('main');

  const hasQualities = qualities.length > 1 || hlsQualities.length > 0;

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => setView('main'), 200);
  };

  return (
    <div className="relative">
      {/* Settings button */}
      <button
        onClick={() => { setOpen(!open); setView('main'); }}
        className={`p-1.5 rounded-md transition-colors ${
          open ? 'text-purple-400 bg-white/10' : 'text-white/80 hover:text-white hover:bg-white/10'
        }`}
        title="Settings"
      >
        <Settings size={18} className={`transition-transform duration-300 ${open ? 'rotate-90' : ''}`} />
      </button>

      {/* Dropdown menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />

          {/* Menu */}
          <div className="absolute bottom-full right-0 mb-2 z-50 min-w-[180px] bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-scale-in">
            {/* Main menu */}
            {view === 'main' && (
              <div className="py-1.5">
                {/* Speed option */}
                <button
                  onClick={() => setView('speed')}
                  className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                >
                  <span>Kecepatan</span>
                  <span className="flex items-center gap-1 text-gray-400">
                    <span className="text-xs">{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                    <ChevronRight size={14} />
                  </span>
                </button>

                {/* Quality option */}
                {hasQualities && (
                  <button
                    onClick={() => setView('quality')}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <span>Kualitas</span>
                    <span className="flex items-center gap-1 text-gray-400">
                      <span className="text-xs">
                        {currentQuality ? `${currentQuality.resolution}p` : 'Auto'}
                      </span>
                      <ChevronRight size={14} />
                    </span>
                  </button>
                )}
              </div>
            )}

            {/* Speed submenu */}
            {view === 'speed' && (
              <div className="py-1.5">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Kecepatan Putar
                </div>
                {SPEED_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { onSpeedChange(opt.value); handleClose(); }}
                    className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${
                      playbackSpeed === opt.value
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {playbackSpeed === opt.value && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}

            {/* Quality submenu */}
            {view === 'quality' && (
              <div className="py-1.5">
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Kualitas Video
                </div>

                {/* HLS qualities (from manifest) */}
                {hlsQualities.length > 0 && (
                  <>
                    <button
                      onClick={() => { onHlsQualityChange(-1); handleClose(); }}
                      className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${
                        currentHlsQuality === -1
                          ? 'text-purple-400 bg-purple-500/10'
                          : 'text-gray-300 hover:bg-white/10'
                      }`}
                    >
                      <span>Auto</span>
                      {currentHlsQuality === -1 && <Check size={14} />}
                    </button>
                    {hlsQualities.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { onHlsQualityChange(i); handleClose(); }}
                        className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${
                          currentHlsQuality === i
                            ? 'text-purple-400 bg-purple-500/10'
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {q.label}
                          {q.height >= 1080 && (
                            <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded font-bold">HD</span>
                          )}
                        </span>
                        {currentHlsQuality === i && <Check size={14} />}
                      </button>
                    ))}
                  </>
                )}

                {/* Manual qualities (from API) */}
                {hlsQualities.length === 0 && qualities.map(q => (
                  <button
                    key={q.resolution}
                    onClick={() => { onQualityChange(q); handleClose(); }}
                    className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${
                      currentQuality?.resolution === q.resolution
                        ? 'text-purple-400 bg-purple-500/10'
                        : 'text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {q.resolution}p
                      {q.resolution >= 1080 && (
                        <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 rounded font-bold">HD</span>
                      )}
                    </span>
                    {currentQuality?.resolution === q.resolution && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
