'use client';

import { useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Maximize, Minimize, PictureInPicture2, Subtitles, Check, ChevronLeft,
  Type, Palette,
} from 'lucide-react';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import SettingsMenu from './SettingsMenu';
import { formatTime } from './useVideoPlayer';
import type { QualityLevel, VideoPlayerState } from './useVideoPlayer';
import type { SubtitleSettings } from './SubtitleOverlay';

interface SubtitleTrack {
  language: string;
  url: string;
  code?: string;
}

interface PlayerControlsProps {
  state: VideoPlayerState;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  qualities: QualityLevel[];
  currentQuality: QualityLevel | null;
  onQualityChange: (q: QualityLevel) => void;
  hlsQualities: { height: number; label: string }[];
  currentHlsQuality: number;
  onHlsQualityChange: (index: number) => void;
  subtitles: SubtitleTrack[];
  activeSubtitle: string | null;
  onSubtitleChange: (code: string | null) => void;
  subtitleSettings: SubtitleSettings;
  onSubtitleSettingsChange: (s: SubtitleSettings) => void;
  visible: boolean;
}

type SubMenuView = 'list' | 'style';

export default function PlayerControls({
  state, onTogglePlay, onSkip, onSeek, onVolumeChange, onToggleMute,
  onSpeedChange, onToggleFullscreen, onTogglePiP,
  qualities, currentQuality, onQualityChange,
  hlsQualities, currentHlsQuality, onHlsQualityChange,
  subtitles, activeSubtitle, onSubtitleChange,
  subtitleSettings, onSubtitleSettingsChange,
  visible,
}: PlayerControlsProps) {
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [subMenuView, setSubMenuView] = useState<SubMenuView>('list');

  const closeSubMenu = () => { setShowSubMenu(false); setTimeout(() => setSubMenuView('list'), 200); };

  const FONT_SIZES: { value: SubtitleSettings['fontSize']; label: string }[] = [
    { value: 'small', label: 'Kecil' },
    { value: 'medium', label: 'Sedang' },
    { value: 'large', label: 'Besar' },
    { value: 'xlarge', label: 'Sangat Besar' },
  ];
  const BG_OPTIONS: { value: SubtitleSettings['background']; label: string }[] = [
    { value: 'none', label: 'Tanpa Background' },
    { value: 'semi', label: 'Semi-transparan' },
    { value: 'solid', label: 'Solid Hitam' },
  ];
  const COLOR_OPTIONS: { value: SubtitleSettings['color']; label: string }[] = [
    { value: 'white', label: 'Putih' },
    { value: 'yellow', label: 'Kuning' },
  ];
  const POS_OPTIONS: { value: SubtitleSettings['position']; label: string }[] = [
    { value: 'bottom', label: 'Bawah' },
    { value: 'higher', label: 'Tengah Bawah' },
    { value: 'highest', label: 'Lebih Tinggi' },
  ];

  return (
    <div
      data-controls
      className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="mx-2 sm:mx-3 mb-2 sm:mb-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/[0.08] px-3 sm:px-4 pt-2 pb-2.5">
        {/* Progress bar */}
        <ProgressBar currentTime={state.currentTime} duration={state.duration} buffered={state.buffered} onSeek={onSeek} />

        {/* Controls row */}
        <div className="flex items-center justify-between gap-1 mt-1">
          {/* Left */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button onClick={onTogglePlay} className="p-1.5 text-white/90 hover:text-white transition-colors rounded-md hover:bg-white/10" title={state.playing ? 'Pause (K)' : 'Play (K)'}>
              {state.playing ? <Pause size={20} /> : <Play size={20} fill="white" />}
            </button>
            <button onClick={() => onSkip(-10)} className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/10 hidden sm:block" title="Mundur 10s (J)">
              <SkipBack size={16} />
            </button>
            <button onClick={() => onSkip(10)} className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/10 hidden sm:block" title="Maju 10s (L)">
              <SkipForward size={16} />
            </button>
            <VolumeControl volume={state.volume} muted={state.muted} onVolumeChange={onVolumeChange} onToggleMute={onToggleMute} />
            <span className="text-white/60 text-[11px] sm:text-xs font-mono ml-1 tabular-nums whitespace-nowrap">
              {formatTime(state.currentTime)}<span className="text-white/30 mx-0.5">/</span>{formatTime(state.duration)}
            </span>
          </div>

          {/* Right */}
          <div className="flex items-center gap-0.5">
            {/* Settings (speed + quality) */}
            <SettingsMenu
              playbackSpeed={state.playbackSpeed} onSpeedChange={onSpeedChange}
              qualities={qualities} currentQuality={currentQuality} onQualityChange={onQualityChange}
              hlsQualities={hlsQualities} currentHlsQuality={currentHlsQuality} onHlsQualityChange={onHlsQualityChange}
            />

            {/* Subtitles */}
            {subtitles.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowSubMenu(!showSubMenu); setSubMenuView('list'); }}
                  className={`p-1.5 rounded-md transition-colors ${activeSubtitle ? 'text-purple-400 bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
                  title="Subtitle"
                >
                  <Subtitles size={18} />
                </button>

                {showSubMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={closeSubMenu} />
                    <div className="absolute bottom-full right-0 mb-2 z-50 min-w-[200px] max-h-[350px] overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                      {/* Subtitle list */}
                      {subMenuView === 'list' && (
                        <div className="py-1.5">
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                            <span>Subtitle</span>
                            <button onClick={() => setSubMenuView('style')} className="text-purple-400 hover:text-purple-300 flex items-center gap-1 normal-case tracking-normal text-[11px] font-medium">
                              <Type size={12} /> Style
                            </button>
                          </div>
                          <button
                            onClick={() => { onSubtitleChange(null); closeSubMenu(); }}
                            className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${!activeSubtitle ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'}`}
                          >
                            <span>Off</span>
                            {!activeSubtitle && <Check size={14} />}
                          </button>
                          {subtitles.map((sub) => (
                            <button
                              key={sub.code || sub.language}
                              onClick={() => { onSubtitleChange(sub.code || sub.language); closeSubMenu(); }}
                              className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${
                                activeSubtitle === (sub.code || sub.language) ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'
                              }`}
                            >
                              <span>{sub.language}</span>
                              {activeSubtitle === (sub.code || sub.language) && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Subtitle style settings */}
                      {subMenuView === 'style' && (
                        <div className="py-1.5">
                          <button onClick={() => setSubMenuView('list')} className="flex items-center gap-1 px-3.5 py-1.5 text-sm text-gray-300 hover:bg-white/10 w-full">
                            <ChevronLeft size={14} /> <span>Kembali</span>
                          </button>
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ukuran Font</div>
                          {FONT_SIZES.map(o => (
                            <button key={o.value} onClick={() => onSubtitleSettingsChange({ ...subtitleSettings, fontSize: o.value })}
                              className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${subtitleSettings.fontSize === o.value ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'}`}>
                              <span>{o.label}</span>
                              {subtitleSettings.fontSize === o.value && <Check size={14} />}
                            </button>
                          ))}
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">Background</div>
                          {BG_OPTIONS.map(o => (
                            <button key={o.value} onClick={() => onSubtitleSettingsChange({ ...subtitleSettings, background: o.value })}
                              className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${subtitleSettings.background === o.value ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'}`}>
                              <span>{o.label}</span>
                              {subtitleSettings.background === o.value && <Check size={14} />}
                            </button>
                          ))}
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">Warna</div>
                          {COLOR_OPTIONS.map(o => (
                            <button key={o.value} onClick={() => onSubtitleSettingsChange({ ...subtitleSettings, color: o.value })}
                              className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${subtitleSettings.color === o.value ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'}`}>
                              <span>{o.label}</span>
                              {subtitleSettings.color === o.value && <Check size={14} />}
                            </button>
                          ))}
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">Posisi</div>
                          {POS_OPTIONS.map(o => (
                            <button key={o.value} onClick={() => onSubtitleSettingsChange({ ...subtitleSettings, position: o.value })}
                              className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${subtitleSettings.position === o.value ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'}`}>
                              <span>{o.label}</span>
                              {subtitleSettings.position === o.value && <Check size={14} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PiP */}
            <button onClick={onTogglePiP} className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/10 hidden sm:block" title="Picture-in-Picture">
              <PictureInPicture2 size={16} />
            </button>

            {/* Fullscreen */}
            <button onClick={onToggleFullscreen} className="p-1.5 text-white/80 hover:text-white transition-colors rounded-md hover:bg-white/10" title="Fullscreen (F)">
              {state.isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
