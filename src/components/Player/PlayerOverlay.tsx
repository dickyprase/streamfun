'use client';

import { useState, useRef } from 'react';
import { Play, SkipBack, SkipForward } from 'lucide-react';

interface PlayerOverlayProps {
  playing: boolean;
  loading: boolean;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  showControls: boolean;
}

export default function PlayerOverlay({ playing, loading, onTogglePlay, onSkip, showControls }: PlayerOverlayProps) {
  const [seekIndicator, setSeekIndicator] = useState<{ side: 'left' | 'right'; count: number } | null>(null);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef<{ left: number; right: number; time: number }>({ left: 0, right: 0, time: 0 });

  // Handle tap/click on overlay zones
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't handle if clicking on controls area
    if ((e.target as HTMLElement).closest('[data-controls]')) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clientX = 'touches' in e
      ? (e as React.TouchEvent).changedTouches[0].clientX
      : (e as React.MouseEvent).clientX;
    const relX = (clientX - rect.left) / rect.width;
    const now = Date.now();

    // Double-tap detection
    if (relX < 0.3) {
      // Left zone - rewind
      if (now - tapCountRef.current.time < 350 && tapCountRef.current.left > 0) {
        onSkip(-10);
        setSeekIndicator({ side: 'left', count: tapCountRef.current.left + 1 });
        tapCountRef.current = { left: tapCountRef.current.left + 1, right: 0, time: now };
        clearTimeout(tapTimerRef.current!);
        tapTimerRef.current = setTimeout(() => setSeekIndicator(null), 800);
        return;
      }
      tapCountRef.current = { left: 1, right: 0, time: now };
    } else if (relX > 0.7) {
      // Right zone - forward
      if (now - tapCountRef.current.time < 350 && tapCountRef.current.right > 0) {
        onSkip(10);
        setSeekIndicator({ side: 'right', count: tapCountRef.current.right + 1 });
        tapCountRef.current = { left: 0, right: tapCountRef.current.right + 1, time: now };
        clearTimeout(tapTimerRef.current!);
        tapTimerRef.current = setTimeout(() => setSeekIndicator(null), 800);
        return;
      }
      tapCountRef.current = { left: 0, right: 1, time: now };
    } else {
      // Center zone - toggle play (desktop) or show controls (mobile)
      tapCountRef.current = { left: 0, right: 0, time: now };
      if (!('ontouchstart' in window)) {
        onTogglePlay();
      }
      return;
    }

    // Single tap timeout - show controls on mobile
    clearTimeout(tapTimerRef.current!);
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = { left: 0, right: 0, time: 0 };
    }, 400);
  };

  return (
    <div
      className="absolute inset-0 z-10"
      onClick={handleTap}
    >
      {/* Gradient overlay (subtle, always visible when controls show) */}
      <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      </div>

      {/* Center play button (shown when paused) */}
      {!playing && !loading && showControls && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-purple-600/80 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-purple-600/40 hover:bg-purple-600 transition-all hover:scale-110 pointer-events-auto"
          >
            <Play size={28} className="text-white ml-1" fill="white" />
          </button>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Double-tap seek indicator */}
      {seekIndicator && (
        <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${
          seekIndicator.side === 'left' ? 'left-[12%]' : 'right-[12%]'
        }`}>
          <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full w-16 h-16 justify-center animate-scale-in">
            {seekIndicator.side === 'left' ? (
              <SkipBack size={20} className="text-white" />
            ) : (
              <SkipForward size={20} className="text-white" />
            )}
            <span className="text-white text-[11px] font-bold">
              {seekIndicator.count * 10}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
