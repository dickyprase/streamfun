'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface QualityLevel {
  resolution: number;
  url: string;
  label: string;
  isAdaptive?: boolean;
}

interface UseVideoPlayerProps {
  src: string;
  autoPlay?: boolean;
}

export interface VideoPlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  muted: boolean;
  playbackSpeed: number;
  isFullscreen: boolean;
  loading: boolean;
  error: boolean;
}

export function useVideoPlayer({ src, autoPlay = false }: UseVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<VideoPlayerState>({
    playing: false,
    currentTime: 0,
    duration: 0,
    buffered: 0,
    volume: 1,
    muted: false,
    playbackSpeed: 1,
    isFullscreen: false,
    loading: true,
    error: false,
  });

  // ─── Core Actions ──────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video || !state.duration) return;
    video.currentTime = Math.max(0, Math.min(time, state.duration));
  }, [state.duration]);

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, state.duration || Infinity));
  }, [state.duration]);

  const setVolume = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, vol));
    video.volume = clamped;
    setState(s => ({ ...s, volume: clamped, muted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setState(s => ({ ...s, muted: !s.muted }));
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setState(s => ({ ...s, playbackSpeed: speed }));
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
        // Lock landscape on mobile
        try { await (screen.orientation as any)?.lock?.('landscape'); } catch {}
        setState(s => ({ ...s, isFullscreen: true }));
      } catch {}
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        try { (screen.orientation as any)?.unlock?.(); } catch {}
        setState(s => ({ ...s, isFullscreen: false }));
      } catch {}
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {}
  }, []);

  // ─── Video Event Listeners ─────────────────────────────────
  // Pakai state flag untuk trigger re-attach saat video element tersedia
  const [videoReady, setVideoReady] = useState(false);

  // Callback ref untuk detect kapan video element mount/unmount
  const setVideoRef = useCallback((node: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    setVideoReady(!!node);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlers = {
      play: () => setState(s => ({ ...s, playing: true })),
      pause: () => setState(s => ({ ...s, playing: false })),
      timeupdate: () => setState(s => ({ ...s, currentTime: video.currentTime })),
      durationchange: () => setState(s => ({ ...s, duration: video.duration || 0 })),
      loadedmetadata: () => setState(s => ({ ...s, duration: video.duration || 0, loading: false })),
      waiting: () => setState(s => ({ ...s, loading: true })),
      canplay: () => setState(s => ({ ...s, loading: false })),
      playing: () => setState(s => ({ ...s, loading: false, playing: true })),
      error: () => setState(s => ({ ...s, error: true, loading: false })),
      volumechange: () => setState(s => ({ ...s, volume: video.volume, muted: video.muted })),
      progress: () => {
        if (video.buffered.length > 0) {
          setState(s => ({ ...s, buffered: video.buffered.end(video.buffered.length - 1) }));
        }
      },
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      video.addEventListener(event, handler);
    });

    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        video.removeEventListener(event, handler);
      });
    };
  }, [videoReady]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setState(s => ({ ...s, isFullscreen: isFs }));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // Reset error + loading state when src changes
  useEffect(() => {
    if (src) {
      setState(s => ({ ...s, error: false, loading: true }));
    }
  }, [src]);

  return {
    videoRef,
    setVideoRef,
    containerRef,
    state,
    actions: {
      togglePlay,
      seek,
      skip,
      setVolume,
      toggleMute,
      setPlaybackSpeed,
      toggleFullscreen,
      togglePiP,
    },
  };
}

// ─── Utility ─────────────────────────────────────────────────

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
