'use client';

import { useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward,
  Maximize, Minimize, PictureInPicture2, Subtitles, Check,
} from 'lucide-react';
import ProgressBar from './ProgressBar';
import VolumeControl from './VolumeControl';
import SettingsMenu from './SettingsMenu';
import { formatTime } from './useVideoPlayer';
import type { QualityLevel, VideoPlayerState } from './useVideoPlayer';

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
  visible: boolean;
}

export default function PlayerControls({
  state,
  onTogglePlay,
  onSkip,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onSpeedChange,
  onToggleFullscreen,
  onTogglePiP,
  qualities,
  currentQuality,
  onQualityChange,
  hlsQualities,
  currentHlsQuality,
  onHlsQualityChange,
  subtitles,
  activeSubtitle,
  onSubtitleChange,
  visible,
}: PlayerControlsProps) {
  const [showSubMenu, setShowSubMenu] = useState(false);
  return (
    <div
      data-controls
      className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      {/* Glassmorphism control bar */}
      <div className="mx-2 sm:mx-3 mb-2 sm:mb-3 rounded-xl bg-black/40 backdrop-blur-xl border border-white/[0.08] px-3 sm:px-4 pt-2 pb-2.5">
        {/* Progress bar */}
        <ProgressBar
          currentTime={state.currentTime}
          duration={state.duration}
          buffered={state.buffered}
          onSeek={onSeek}
        />

        {/* Controls row */}
        <div className="flex items-center justify-between gap-1 mt-1">
          {/* Left side */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Play/Pause */}
            <button
              onClick={onTogglePlay}
              className="p-1.5 text-white/90 hover:text-white transition-colors rounded-md hover:bg-white/10"
              title={state.playing ? 'Pause (K)' : 'Play (K)'}
            >
              {state.playing ? <Pause size={20} /> : <Play size={20} fill="white" />}
            </button>

            {/* Skip back */}
            <button
              onClick={() => onSkip(-10)}
              className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/10 hidden sm:block"
              title="Mundur 10s (J)"
            >
              <SkipBack size={16} />
            </button>

            {/* Skip forward */}
            <button
              onClick={() => onSkip(10)}
              className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/10 hidden sm:block"
              title="Maju 10s (L)"
            >
              <SkipForward size={16} />
            </button>

            {/* Volume */}
            <VolumeControl
              volume={state.volume}
              muted={state.muted}
              onVolumeChange={onVolumeChange}
              onToggleMute={onToggleMute}
            />

            {/* Time display */}
            <span className="text-white/60 text-[11px] sm:text-xs font-mono ml-1 tabular-nums whitespace-nowrap">
              {formatTime(state.currentTime)}
              <span className="text-white/30 mx-0.5">/</span>
              {formatTime(state.duration)}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-0.5">
            {/* Settings (speed + quality) */}
            <SettingsMenu
              playbackSpeed={state.playbackSpeed}
              onSpeedChange={onSpeedChange}
              qualities={qualities}
              currentQuality={currentQuality}
              onQualityChange={onQualityChange}
              hlsQualities={hlsQualities}
              currentHlsQuality={currentHlsQuality}
              onHlsQualityChange={onHlsQualityChange}
            />

            {/* Subtitles */}
            {subtitles.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowSubMenu(!showSubMenu)}
                  className={`p-1.5 rounded-md transition-colors ${
                    activeSubtitle ? 'text-purple-400 bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title="Subtitle"
                >
                  <Subtitles size={18} />
                </button>
                {showSubMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSubMenu(false)} />
                    <div className="absolute bottom-full right-0 mb-2 z-50 min-w-[160px] bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-scale-in">
                      <div className="py-1.5">
                        <div className="px-3.5 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Subtitle</div>
                        <button
                          onClick={() => { onSubtitleChange(null); setShowSubMenu(false); }}
                          className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${
                            !activeSubtitle ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'
                          }`}
                        >
                          <span>Off</span>
                          {!activeSubtitle && <Check size={14} />}
                        </button>
                        {subtitles.map((sub) => (
                          <button
                            key={sub.code || sub.language}
                            onClick={() => { onSubtitleChange(sub.code || sub.language); setShowSubMenu(false); }}
                            className={`w-full flex items-center justify-between px-3.5 py-1.5 text-sm transition-colors ${
                              activeSubtitle === (sub.code || sub.language) ? 'text-purple-400 bg-purple-500/10' : 'text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            <span>{sub.language}</span>
                            {activeSubtitle === (sub.code || sub.language) && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PiP */}
            <button
              onClick={onTogglePiP}
              className="p-1.5 text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/10 hidden sm:block"
              title="Picture-in-Picture"
            >
              <PictureInPicture2 size={16} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 text-white/80 hover:text-white transition-colors rounded-md hover:bg-white/10"
              title="Fullscreen (F)"
            >
              {state.isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
