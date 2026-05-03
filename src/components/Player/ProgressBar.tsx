'use client';

import { useState, useRef, useCallback } from 'react';
import { formatTime } from './useVideoPlayer';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
}

export default function ProgressBar({ currentTime, duration, buffered, onSeek }: ProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [dragTime, setDragTime] = useState(0);

  const getTimeFromEvent = useCallback((e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || !duration) return 0;
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0]?.clientX ?? (e as TouchEvent).changedTouches[0]?.clientX : (e as MouseEvent).clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pos * duration;
  }, [duration]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverX(e.clientX - rect.left);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const time = getTimeFromEvent(e);
    setDragTime(time);

    const onMove = (ev: MouseEvent) => {
      const t = getTimeFromEvent(ev);
      setDragTime(t);
    };
    const onUp = (ev: MouseEvent) => {
      const t = getTimeFromEvent(ev);
      onSeek(t);
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const time = getTimeFromEvent(e);
    setDragTime(time);

    const onMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const t = getTimeFromEvent(ev);
      setDragTime(t);
    };
    const onEnd = (ev: TouchEvent) => {
      const t = getTimeFromEvent(ev);
      onSeek(t);
      setIsDragging(false);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const progress = duration ? ((isDragging ? dragTime : currentTime) / duration) * 100 : 0;
  const bufferProgress = duration ? (buffered / duration) * 100 : 0;

  return (
    <div className="relative group/bar w-full py-2 cursor-pointer">
      {/* Hover timestamp tooltip */}
      {hoverTime !== null && !isDragging && (
        <div
          className="absolute -top-8 transform -translate-x-1/2 bg-black/90 text-white text-[11px] font-mono px-2 py-0.5 rounded pointer-events-none z-10"
          style={{ left: `${hoverX}px` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {/* Drag time display */}
      {isDragging && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-sm text-white text-sm font-bold px-3 py-1 rounded-lg pointer-events-none z-10">
          {formatTime(dragTime)}
        </div>
      )}

      {/* Bar container */}
      <div
        ref={barRef}
        className="relative w-full h-1 group-hover/bar:h-1.5 transition-all duration-150 rounded-full overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverTime(null)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-white/20 rounded-full" />

        {/* Buffer */}
        <div
          className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
          style={{ width: `${bufferProgress}%` }}
        />

        {/* Progress */}
        <div
          className="absolute inset-y-0 left-0 bg-purple-500 rounded-full transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />

        {/* Hover highlight */}
        {hoverTime !== null && (
          <div
            className="absolute inset-y-0 left-0 bg-white/10 rounded-full"
            style={{ width: `${(hoverTime / duration) * 100}%` }}
          />
        )}
      </div>

      {/* Thumb (visible on hover/drag) */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-purple-500 rounded-full shadow-lg shadow-purple-500/50 transition-opacity ${
          isDragging ? 'opacity-100 scale-125' : 'opacity-0 group-hover/bar:opacity-100'
        }`}
        style={{ left: `calc(${progress}% - 7px)` }}
      />
    </div>
  );
}
