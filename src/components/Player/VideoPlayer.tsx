'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Hls from 'hls.js';
import { useVideoPlayer, type QualityLevel } from './useVideoPlayer';
import PlayerControls from './PlayerControls';
import PlayerOverlay from './PlayerOverlay';
import SubtitleOverlay, { type SubtitleSettings, DEFAULT_SUBTITLE_SETTINGS } from './SubtitleOverlay';

export interface SubtitleTrack {
  language: string;
  url: string;
  code?: string;
}

export interface VideoPlayerProps {
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
  initialSeekTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

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
  initialSeekTime = 0,
  onTimeUpdate,
}: VideoPlayerProps) {
  const { videoRef, setVideoRef, containerRef, state, actions } = useVideoPlayer({ src, autoPlay });

  const hlsRef = useRef<Hls | null>(null);
  const [hlsQualities, setHlsQualities] = useState<{ height: number; label: string }[]>([]);
  const [currentHlsQuality, setCurrentHlsQuality] = useState(-1);

  const [activeSubtitle, setActiveSubtitle] = useState<string | null>(null);
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>(DEFAULT_SUBTITLE_SETTINGS);

  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [resolvedUrl, setResolvedUrl] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // For preserving time on quality switch only
  const pendingSeekRef = useRef(0);
  const initialSeekRef = useRef(initialSeekTime);
  const lastTimeUpdateRef = useRef(0);

  // Track previous src to detect quality-only changes vs episode changes
  const prevSrcRef = useRef('');

  useEffect(() => { initialSeekRef.current = initialSeekTime; }, [initialSeekTime]);

  // Load subtitle settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sf-subtitle-settings');
      if (saved) setSubtitleSettings(JSON.parse(saved));
    } catch {}
  }, []);

  const saveSubtitleSettings = (s: SubtitleSettings) => {
    setSubtitleSettings(s);
    try { localStorage.setItem('sf-subtitle-settings', JSON.stringify(s)); } catch {}
  };

  // ─── Resolve stream URL ────────────────────────────────────

  useEffect(() => {
    if (!src) {
      setResolvedUrl('');
      setResolveError(false);
      return;
    }

    if (!src.startsWith('/api/proxy/stream')) {
      setResolvedUrl(src);
      setResolveError(false);
      prevSrcRef.current = src;
      return;
    }

    let cancelled = false;
    setResolving(true);
    setResolveError(false);

    // Detect if this is a quality-only change (same id+season+episode, different resolution)
    // vs an episode/content change
    const isQualitySwitch = isOnlyResolutionChange(prevSrcRef.current, src);
    prevSrcRef.current = src;

    // Only preserve time for quality switches, NOT episode changes
    if (isQualitySwitch) {
      const video = videoRef.current;
      if (video && video.currentTime > 1 && !isNaN(video.currentTime)) {
        pendingSeekRef.current = video.currentTime;
      }
    } else {
      // Episode/content change: reset seek
      pendingSeekRef.current = 0;
    }

    (async () => {
      try {
        const res = await fetch(src);
        const data = await res.json();
        if (res.ok && data.url && !cancelled) {
          setResolvedUrl(data.url);
          setRetryCount(0);
        } else if (!cancelled) {
          setResolveError(true);
        }
      } catch {
        if (!cancelled) setResolveError(true);
      }
      if (!cancelled) setResolving(false);
    })();

    return () => { cancelled = true; };
  }, [src, retryCount]);

  // ─── Source init ───────────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !resolvedUrl) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; setHlsQualities([]); }

    const isHls = resolvedUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
      hls.loadSource(resolvedUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setHlsQualities(data.levels.map(l => ({ height: l.height, label: `${l.height}p` })));
        setCurrentHlsQuality(-1);
        applyPendingSeek(video);
      });
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        }
      });
      hlsRef.current = hls;
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = resolvedUrl;
      video.addEventListener('loadeddata', () => applyPendingSeek(video), { once: true });
    } else {
      video.src = resolvedUrl;
      video.load();
      video.addEventListener('loadeddata', () => applyPendingSeek(video), { once: true });
    }

    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [resolvedUrl]);

  const applyPendingSeek = (video: HTMLVideoElement) => {
    if (pendingSeekRef.current > 1) {
      video.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = 0;
    } else if (initialSeekRef.current > 1) {
      video.currentTime = initialSeekRef.current;
      initialSeekRef.current = 0;
    }
  };

  // ─── Time update for progress saving ──────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;
    const handler = () => {
      const now = Math.floor(video.currentTime);
      if (now > 0 && now !== lastTimeUpdateRef.current && now % 10 === 0) {
        lastTimeUpdateRef.current = now;
        onTimeUpdate(video.currentTime, video.duration || 0);
      }
    };
    video.addEventListener('timeupdate', handler);
    return () => video.removeEventListener('timeupdate', handler);
  }, [onTimeUpdate, videoRef.current]);

  // ─── HLS Quality ──────────────────────────────────────────

  const handleHlsQualityChange = useCallback((index: number) => {
    if (hlsRef.current) { hlsRef.current.currentLevel = index; setCurrentHlsQuality(index); }
  }, []);

  // ─── Subtitle ─────────────────────────────────────────────

  const handleSubtitleChange = useCallback((code: string | null) => {
    setActiveSubtitle(code);
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      const isActive = code && (track.language === code || track.label?.toLowerCase().includes(code.toLowerCase()));
      track.mode = isActive ? 'hidden' : 'disabled';
    }
  }, []);

  // ─── Controls auto-hide ───────────────────────────────────

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (state.playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 2500);
    }
  }, [state.playing]);

  useEffect(() => {
    if (!state.playing) { setShowControls(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }
    else showControlsTemporarily();
  }, [state.playing, showControlsTemporarily]);

  // ─── Keyboard ─────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      switch (e.key.toLowerCase()) {
        case ' ': case 'k': e.preventDefault(); actions.togglePlay(); showControlsTemporarily(); break;
        case 'f': e.preventDefault(); actions.toggleFullscreen(); break;
        case 'm': e.preventDefault(); actions.toggleMute(); showControlsTemporarily(); break;
        case 'j': case 'arrowleft': e.preventDefault(); actions.skip(-10); showControlsTemporarily(); break;
        case 'l': case 'arrowright': e.preventDefault(); actions.skip(10); showControlsTemporarily(); break;
        case 'arrowup': e.preventDefault(); actions.setVolume(state.volume + 0.1); showControlsTemporarily(); break;
        case 'arrowdown': e.preventDefault(); actions.setVolume(state.volume - 0.1); showControlsTemporarily(); break;
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [actions, state.volume, showControlsTemporarily]);

  const handleRetry = () => { setResolveError(false); setRetryCount(c => c + 1); };

  // ─── Render ───────────────────────────────────────────────

  const isLoading = externalLoading || resolving || (!resolvedUrl && !!src && !resolveError);
  const hasError = (state.error || resolveError) && !isLoading;
  const showVideo = !isLoading && !hasError && !!resolvedUrl;

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
      <video
        ref={setVideoRef}
        poster={poster}
        className={`w-full h-full object-contain ${showVideo ? '' : 'invisible'}`}
        playsInline preload="metadata" crossOrigin="anonymous"
      >
        {subtitles.map((sub) => (
          <track key={sub.code || sub.language} kind="subtitles" src={sub.url} srcLang={sub.code || 'en'} label={sub.language} />
        ))}
      </video>

      {showVideo && activeSubtitle && (
        <SubtitleOverlay videoRef={videoRef} activeSubtitle={activeSubtitle} settings={subtitleSettings} />
      )}

      {(isLoading || !src) && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-900">
          {poster && <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
          <div className="text-center z-10">
            <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Memuat video...</p>
          </div>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-neutral-900">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-gray-400 text-sm">Video tidak dapat dimuat</p>
            <button onClick={handleRetry} className="mt-3 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {showVideo && (
        <PlayerOverlay playing={state.playing} loading={state.loading} onTogglePlay={actions.togglePlay} onSkip={actions.skip} showControls={showControls} />
      )}

      {showVideo && (
        <PlayerControls
          state={state}
          onTogglePlay={actions.togglePlay} onSkip={actions.skip} onSeek={actions.seek}
          onVolumeChange={actions.setVolume} onToggleMute={actions.toggleMute}
          onSpeedChange={actions.setPlaybackSpeed} onToggleFullscreen={actions.toggleFullscreen} onTogglePiP={actions.togglePiP}
          qualities={qualities} currentQuality={currentQuality} onQualityChange={onQualityChange || (() => {})}
          hlsQualities={hlsQualities} currentHlsQuality={currentHlsQuality} onHlsQualityChange={handleHlsQualityChange}
          subtitles={subtitles} activeSubtitle={activeSubtitle} onSubtitleChange={handleSubtitleChange}
          subtitleSettings={subtitleSettings} onSubtitleSettingsChange={saveSubtitleSettings}
          visible={showControls || !state.playing}
        />
      )}

      {showVideo && title && (
        <div className={`absolute top-0 left-0 right-0 z-20 p-3 sm:p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white/90 text-sm font-medium truncate drop-shadow-lg">{title}</p>
        </div>
      )}
    </div>
  );
}

/** Check if two proxy URLs differ only in resolution param */
function isOnlyResolutionChange(prevSrc: string, newSrc: string): boolean {
  if (!prevSrc || !newSrc) return false;
  try {
    const prev = new URL(prevSrc, 'http://x');
    const next = new URL(newSrc, 'http://x');
    // Same path?
    if (prev.pathname !== next.pathname) return false;
    // Compare all params except resolution
    const prevId = prev.searchParams.get('id');
    const nextId = next.searchParams.get('id');
    const prevSe = prev.searchParams.get('season');
    const nextSe = next.searchParams.get('season');
    const prevEp = prev.searchParams.get('episode');
    const nextEp = next.searchParams.get('episode');
    // Same content + same episode = quality switch
    return prevId === nextId && prevSe === nextSe && prevEp === nextEp;
  } catch {
    return false;
  }
}
