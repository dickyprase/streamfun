'use client';

/**
 * Modern Lightweight Video Player for Next.js
 * 
 * Features:
 * - Glassmorphism UI with auto-hide controls
 * - HLS/m3u8 streaming support via hls.js
 * - Quality selector (auto from HLS manifest + manual)
 * - Playback speed control (0.25x - 2x)
 * - Subtitle selector with multi-language support
 * - Double-tap to seek (mobile)
 * - Keyboard shortcuts (Space, F, M, J, L, arrows)
 * - Picture-in-Picture support
 * - Fullscreen with landscape lock (mobile)
 * - Responsive design (mobile/tablet/desktop)
 * 
 * Dependencies: hls.js, lucide-react, tailwindcss
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Hls from 'hls.js';
import { useVideoPlayer, type QualityLevel } from './useVideoPlayer';
import PlayerControls from './PlayerControls';
import PlayerOverlay from './PlayerOverlay';

// ─── Props Interface ─────────────────────────────────────────

export interface SubtitleTrack {
  language: string;
  url: string;
  code?: string;
}

export interface VideoPlayerProps {
  /** Proxy stream URL pattern: /api/proxy/stream?id=X&season=Y&episode=Z&resolution=R */
  src: string;
  poster?: string;
  title?: string;
  loading?: boolean;
  qualities?: QualityLevel[];
  currentQuality?: QualityLevel | null;
  onQualityChange?: (q: QualityLevel) => void;
  subtitles?: SubtitleTrack[];
  autoPlay?: boolean;
  className?: string;
}

// ─── Main Component ──────────────────────────────────────────

export default function VideoPlayer({
  src,
  poster,
  title,
  loading: externalLoading = false,
  qualities = [],
  currentQuality = null,
  onQualityChange,
  subtitles = [],
  autoPlay = false,
  className = '',
}: VideoPlayerProps) {
  const { videoRef, containerRef, state, actions } = useVideoPlayer({ src, autoPlay });

  // HLS instance
  const hlsRef = useRef<Hls | null>(null);
  const [hlsQualities, setHlsQualities] = useState<{ height: number; label: string }[]>([]);
  const [currentHlsQuality, setCurrentHlsQuality] = useState(-1);

  // Subtitle state
  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);

  // Controls visibility
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resolved video URL (fresh from proxy)
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [resolving, setResolving] = useState(false);

  // ─── Resolve fresh video URL from proxy ────────────────────
  // The src is a proxy URL like /api/proxy/stream?id=X&...
  // We fetch it to get the actual playable video URL with fresh token

  useEffect(() => {
    if (!src) {
      setResolvedUrl('');
      return;
    }

    // If src is already a direct video URL (not our proxy), use it directly
    if (!src.startsWith('/api/proxy/stream')) {
      setResolvedUrl(src);
      return;
    }

    let cancelled = false;
    setResolving(true);

    (async () => {
      try {
        const res = await fetch(src);
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && data.url) {
            setResolvedUrl(data.url);
          }
        }
      } catch (err) {
        console.error('Failed to resolve stream URL:', err);
      }
      if (!cancelled) setResolving(false);
    })();

    return () => { cancelled = true; };
  }, [src]);

  // ─── Source Initialization (HLS or MP4) ─────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedUrl) return;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
      setHlsQualities([]);
    }

    const isHls = resolvedUrl.includes('.m3u8') || resolvedUrl.includes('application/x-mpegURL');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels.map((level) => ({
          height: level.height,
          label: `${level.height}p`,
        }));
        setHlsQualities(levels);
        setCurrentHlsQuality(-1);
        if (autoPlay) video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = resolvedUrl;
      if (autoPlay) video.play().catch(() => {});
    } else {
      // Regular MP4 - set src directly (fresh token URL)
      video.src = resolvedUrl;
      video.load();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [resolvedUrl, autoPlay, videoRef]);

  // ─── HLS Quality Change ──────────────────────────────────

  const handleHlsQualityChange = useCallback((index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentHlsQuality(index);
    }
  }, []);

  // ─── Subtitle Change ───────────────────────────────────────

  const handleSubtitleChange = useCallback((code: string | null) => {
    setActiveSubtitle(code);
    const video = videoRef.current;
    if (!video) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (code === null) {
        track.mode = 'hidden';
      } else if (track.language === code || track.label?.toLowerCase().includes(code.toLowerCase())) {
        track.mode = 'showing';
      } else {
        track.mode = 'hidden';
      }
    }
  }, [videoRef]);

  // ─── Controls Auto-Hide ──────────────────────────────────

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (state.playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [state.playing]);

  useEffect(() => {
    if (!state.playing) {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    } else {
      showControlsTemporarily();
    }
  }, [state.playing, showControlsTemporarily]);

  // ─── Keyboard Shortcuts ──────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          actions.togglePlay();
          showControlsTemporarily();
          break;
        case 'f':
          e.preventDefault();
          actions.toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          actions.toggleMute();
          showControlsTemporarily();
          break;
        case 'j':
        case 'arrowleft':
          e.preventDefault();
          actions.skip(-10);
          showControlsTemporarily();
          break;
        case 'l':
        case 'arrowright':
          e.preventDefault();
          actions.skip(10);
          showControlsTemporarily();
          break;
        case 'arrowup':
          e.preventDefault();
          actions.setVolume(state.volume + 0.1);
          showControlsTemporarily();
          break;
        case 'arrowdown':
          e.preventDefault();
          actions.setVolume(state.volume - 0.1);
          showControlsTemporarily();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, state.volume, showControlsTemporarily]);

  // ─── Loading / No Source State ─────────────────────────────

  const isLoading = externalLoading || resolving || (!resolvedUrl && !!src);

  if (isLoading || !src) {
    return (
      <div className={`relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        {poster && <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
        <div className="text-center z-10">
          <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Memuat video...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────

  if (state.error) {
    return (
      <div className={`relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-400 text-sm">Video tidak dapat dimuat</p>
          <p className="text-gray-500 text-xs mt-1">Coba refresh halaman atau pilih kualitas lain</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden select-none group ${
        state.isFullscreen ? 'fixed inset-0 z-[99999] rounded-none' : 'aspect-video rounded-xl'
      } ${className}`}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => state.playing && setShowControls(false)}
      onTouchStart={showControlsTemporarily}
      tabIndex={0}
    >
      {/* Native video element */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      >
        {/* Subtitle tracks */}
        {subtitles.map((sub) => (
          <track
            key={sub.code || sub.language}
            kind="subtitles"
            src={sub.url}
            srcLang={sub.code || 'en'}
            label={sub.language}
          />
        ))}
      </video>

      {/* Overlay (center play button + double-tap zones) */}
      <PlayerOverlay
        playing={state.playing}
        loading={state.loading}
        onTogglePlay={actions.togglePlay}
        onSkip={actions.skip}
        showControls={showControls}
      />

      {/* Bottom control bar (glassmorphism) */}
      <PlayerControls
        state={state}
        onTogglePlay={actions.togglePlay}
        onSkip={actions.skip}
        onSeek={actions.seek}
        onVolumeChange={actions.setVolume}
        onToggleMute={actions.toggleMute}
        onSpeedChange={actions.setPlaybackSpeed}
        onToggleFullscreen={actions.toggleFullscreen}
        onTogglePiP={actions.togglePiP}
        qualities={qualities}
        currentQuality={currentQuality}
        onQualityChange={onQualityChange || (() => {})}
        hlsQualities={hlsQualities}
        currentHlsQuality={currentHlsQuality}
        onHlsQualityChange={handleHlsQualityChange}
        subtitles={subtitles}
        activeSubtitle={activeSubtitle}
        onSubtitleChange={handleSubtitleChange}
        visible={showControls || !state.playing}
      />

      {/* Title overlay (top-left, shown with controls) */}
      {title && (
        <div className={`absolute top-0 left-0 right-0 z-20 p-3 sm:p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
          <p className="text-white/90 text-sm font-medium truncate drop-shadow-lg">{title}</p>
        </div>
      )}
    </div>
  );
}
