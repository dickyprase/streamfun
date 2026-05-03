'use client';

/**
 * VideoPlayer - ArtPlayer wrapper for Next.js
 *
 * Features (all handled by ArtPlayer natively):
 * - Quality switching with time preservation
 * - Subtitle display with custom styling (font size, bg, color)
 * - Resume playback (autoPlayback localStorage + server-side)
 * - Mobile gestures (swipe seek/volume, long-press fast-forward, lock)
 * - Playback speed control
 * - Fullscreen + PiP + keyboard shortcuts
 * - HLS streaming via hls.js
 */

import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

// ─── Types ───────────────────────────────────────────────────

export interface QualityOption {
  resolution: number;
  label: string;
  url?: string; // not used directly - we fetch fresh URLs via proxy
}

export interface SubtitleOption {
  language: string;
  url: string;
  code?: string;
}

export interface VideoPlayerProps {
  /** Proxy stream URL: /api/proxy/stream?id=X&season=Y&episode=Z */
  src: string;
  poster?: string;
  title?: string;
  loading?: boolean;
  qualities?: QualityOption[];
  subtitles?: SubtitleOption[];
  /** Unique content ID for autoPlayback key */
  contentId?: string;
  /** Called periodically with (currentTime, duration) for server-side progress */
  onTimeUpdate?: (time: number, duration: number) => void;
  className?: string;
}

// ─── Subtitle style presets ──────────────────────────────────

const SUBTITLE_SIZES = [
  { html: 'Kecil', value: '16px' },
  { html: 'Sedang', value: '22px' },
  { html: 'Besar', value: '28px' },
  { html: 'Sangat Besar', value: '36px' },
];

const SUBTITLE_BACKGROUNDS = [
  { html: 'Tanpa Background', value: 'transparent' },
  { html: 'Semi-transparan', value: 'rgba(0,0,0,0.6)' },
  { html: 'Hitam Solid', value: 'rgba(0,0,0,0.9)' },
];

const SUBTITLE_COLORS = [
  { html: 'Putih', value: '#FFFFFF' },
  { html: 'Kuning', value: '#FFFF00' },
];

// ─── Helper: fetch fresh video URL from proxy ────────────────

async function fetchFreshUrl(proxySrc: string): Promise<string> {
  try {
    const res = await fetch(proxySrc);
    const data = await res.json();
    if (res.ok && data.url) return data.url;
  } catch {}
  return '';
}

// ─── Helper: build proxy URL for a specific resolution ───────

function buildProxyUrl(baseSrc: string, resolution?: number): string {
  if (!baseSrc.startsWith('/api/proxy/stream')) return baseSrc;
  try {
    const url = new URL(baseSrc, window.location.origin);
    if (resolution) url.searchParams.set('resolution', String(resolution));
    return url.pathname + url.search;
  } catch {
    return baseSrc;
  }
}

// ─── Component ───────────────────────────────────────────────

export default function VideoPlayer({
  src,
  poster,
  title,
  loading: externalLoading = false,
  qualities = [],
  subtitles = [],
  contentId,
  onTimeUpdate,
  className = '',
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const lastProgressSave = useRef(0);

  // Subtitle style state (persisted in localStorage)
  const [subFontSize, setSubFontSize] = useState('22px');
  const [subBackground, setSubBackground] = useState('rgba(0,0,0,0.6)');
  const [subColor, setSubColor] = useState('#FFFFFF');

  // Load saved subtitle settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sf-sub-style');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.fontSize) setSubFontSize(s.fontSize);
        if (s.background) setSubBackground(s.background);
        if (s.color) setSubColor(s.color);
      }
    } catch {}
  }, []);

  const saveSubStyle = (fontSize: string, background: string, color: string) => {
    try { localStorage.setItem('sf-sub-style', JSON.stringify({ fontSize, background, color })); } catch {}
  };

  // ─── Initialize ArtPlayer ──────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || !src || externalLoading) return;

    // Destroy previous instance
    if (artRef.current) {
      artRef.current.destroy(false);
      artRef.current = null;
    }

    let destroyed = false;

    (async () => {
      // Fetch fresh video URL from proxy
      const videoUrl = await fetchFreshUrl(src);
      if (destroyed || !videoUrl || !containerRef.current) return;

      // Build quality list with fresh URLs fetched on-demand
      const qualityList = qualities.map((q, i) => ({
        default: i === qualities.length - 1, // highest = default
        html: `${q.resolution}p`,
        url: videoUrl, // initial URL (will be refreshed on switch)
        _resolution: q.resolution,
      }));

      // Build subtitle settings for the settings panel
      const subtitleSettings: any[] = [];

      if (subtitles.length > 0) {
        // Subtitle language selector
        subtitleSettings.push({
          html: 'Subtitle',
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 12h4m-2-2v4m4-2h4"/></svg>',
          tooltip: 'Off',
          selector: [
            { html: 'Off', default: true },
            ...subtitles.map(sub => ({
              html: sub.language,
              url: sub.url,
              _code: sub.code,
            })),
          ],
          onSelect(item: any) {
            if (item.html === 'Off') {
              artRef.current!.subtitle.show = false;
              return item.html;
            }
            artRef.current!.subtitle.show = true;
            artRef.current!.subtitle.switch(item.url, { name: item.html });
            return item.html;
          },
        });

        // Font size
        subtitleSettings.push({
          html: 'Ukuran Subtitle',
          tooltip: SUBTITLE_SIZES.find(s => s.value === subFontSize)?.html || 'Sedang',
          selector: SUBTITLE_SIZES.map(s => ({
            html: s.html,
            _value: s.value,
            default: s.value === subFontSize,
          })),
          onSelect(item: any) {
            setSubFontSize(item._value);
            saveSubStyle(item._value, subBackground, subColor);
            if (artRef.current) {
              artRef.current.subtitle.style({ fontSize: item._value });
            }
            return item.html;
          },
        });

        // Background
        subtitleSettings.push({
          html: 'Background Subtitle',
          tooltip: SUBTITLE_BACKGROUNDS.find(s => s.value === subBackground)?.html || 'Semi-transparan',
          selector: SUBTITLE_BACKGROUNDS.map(s => ({
            html: s.html,
            _value: s.value,
            default: s.value === subBackground,
          })),
          onSelect(item: any) {
            setSubBackground(item._value);
            saveSubStyle(subFontSize, item._value, subColor);
            if (artRef.current) {
              artRef.current.subtitle.style({ backgroundColor: item._value });
            }
            return item.html;
          },
        });

        // Color
        subtitleSettings.push({
          html: 'Warna Subtitle',
          tooltip: SUBTITLE_COLORS.find(s => s.value === subColor)?.html || 'Putih',
          selector: SUBTITLE_COLORS.map(s => ({
            html: s.html,
            _value: s.value,
            default: s.value === subColor,
          })),
          onSelect(item: any) {
            setSubColor(item._value);
            saveSubStyle(subFontSize, subBackground, item._value);
            if (artRef.current) {
              artRef.current.subtitle.style({ color: item._value });
            }
            return item.html;
          },
        });
      }

      // Create ArtPlayer instance
      const art = new Artplayer({
        container: containerRef.current!,
        url: videoUrl,
        poster: poster || '',
        theme: '#8b5cf6',
        volume: 0.8,
        lang: 'en',

        // ─── Built-in features ─────────────────────────
        hotkey: true,
        pip: true,
        fullscreen: true,
        fullscreenWeb: true,
        setting: true,
        playbackRate: true,
        aspectRatio: true,
        flip: true,
        lock: true,
        gesture: true,
        fastForward: true,
        autoPlayback: true,
        miniProgressBar: true,
        playsInline: true,
        mutex: true,
        backdrop: true,

        // ─── Unique ID for autoPlayback ────────────────
        id: contentId || src,

        // ─── Quality selector ──────────────────────────
        quality: qualityList.length > 1 ? qualityList : [],

        // ─── Subtitle (first one as default, or empty) ─
        subtitle: subtitles.length > 0 ? {
          url: subtitles[0].url,
          type: 'srt',
          style: {
            color: subColor,
            fontSize: subFontSize,
            backgroundColor: subBackground,
            padding: '4px 8px',
            borderRadius: '4px',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            bottom: '60px',
          },
          encoding: 'utf-8',
        } : {},

        // ─── Custom settings (subtitle style) ──────────
        settings: subtitleSettings,

        // ─── HLS support via hls.js ────────────────────
        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            if (Hls.isSupported()) {
              const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
              hls.loadSource(url);
              hls.attachMedia(video);
              hls.on(Hls.Events.ERROR, (_e, data) => {
                if (data.fatal) {
                  if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
                  else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
                }
              });
              // Store hls instance for cleanup
              (art as any)._hls = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            }
          },
        },
      });

      artRef.current = art;

      // ─── Quality switch handler (fetch fresh URL) ────
      art.on('video:quality', async (quality: any) => {
        if (!quality._resolution) return;
        const proxyUrl = buildProxyUrl(src, quality._resolution);
        const freshUrl = await fetchFreshUrl(proxyUrl);
        if (freshUrl && artRef.current) {
          artRef.current.switchQuality(freshUrl);
        }
      });

      // ─── Server-side progress saving ─────────────────
      if (onTimeUpdate) {
        art.on('video:timeupdate', () => {
          const now = Math.floor(art.currentTime);
          if (now > 0 && now % 10 === 0 && now !== lastProgressSave.current) {
            lastProgressSave.current = now;
            onTimeUpdate(art.currentTime, art.duration);
          }
        });
      }
    })();

    return () => {
      destroyed = true;
      if (artRef.current) {
        // Cleanup HLS
        if ((artRef.current as any)._hls) {
          (artRef.current as any)._hls.destroy();
        }
        artRef.current.destroy(false);
        artRef.current = null;
      }
    };
  }, [src, externalLoading]); // Re-init when src changes (episode/content switch)

  // ─── Loading state ─────────────────────────────────────────

  if (externalLoading || !src) {
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

  // ─── Render ────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`w-full aspect-video rounded-xl overflow-hidden ${className}`}
    />
  );
}
