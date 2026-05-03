'use client';

/**
 * VideoPlayer - ArtPlayer wrapper for Next.js
 *
 * Fixes applied:
 * - Quality switch via custom settings (not built-in quality option)
 * - Subtitle: strip <font> tags, escape:false, onVttLoad cleanup
 * - Default: Indonesian subtitle ON, transparent background
 */

import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';

// ─── Types ───────────────────────────────────────────────────

export interface QualityOption {
  resolution: number;
  label: string;
  url?: string;
}

export interface SubtitleOption {
  language: string;
  url: string;
  code?: string;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  loading?: boolean;
  qualities?: QualityOption[];
  subtitles?: SubtitleOption[];
  contentId?: string;
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

// ─── Helpers ─────────────────────────────────────────────────

async function fetchFreshUrl(proxySrc: string): Promise<string> {
  try {
    const res = await fetch(proxySrc);
    const data = await res.json();
    if (res.ok && data.url) return data.url;
  } catch {}
  return '';
}

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

/** Strip HTML <font> tags from subtitle text but keep content */
function stripFontTags(vtt: string): string {
  return vtt.replace(/<\/?font[^>]*>/gi, '');
}

/** Find Indonesian subtitle from list, fallback to first */
function findDefaultSubtitle(subs: SubtitleOption[]): SubtitleOption | null {
  if (subs.length === 0) return null;
  // Try Indonesian variants
  const indo = subs.find(s =>
    s.code === 'in_id' || s.code === 'id' || s.code === 'in' ||
    s.language?.toLowerCase().includes('indonesian') ||
    s.language?.toLowerCase().includes('indonesia')
  );
  return indo || subs[0];
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
  const srcRef = useRef(src); // track src for quality switch proxy URL

  // Subtitle style state - DEFAULT: transparent background
  const [subFontSize, setSubFontSize] = useState('22px');
  const [subBackground, setSubBackground] = useState('transparent');
  const [subColor, setSubColor] = useState('#FFFFFF');

  // Load saved subtitle settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sf-sub-style');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.fontSize) setSubFontSize(s.fontSize);
        if (s.background !== undefined) setSubBackground(s.background);
        if (s.color) setSubColor(s.color);
      }
    } catch {}
  }, []);

  const saveSubStyle = (fontSize: string, background: string, color: string) => {
    try { localStorage.setItem('sf-sub-style', JSON.stringify({ fontSize, background, color })); } catch {}
  };

  // Keep srcRef in sync
  useEffect(() => { srcRef.current = src; }, [src]);

  // ─── Initialize ArtPlayer ──────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || !src || externalLoading) return;

    if (artRef.current) {
      artRef.current.destroy(false);
      artRef.current = null;
    }

    let destroyed = false;

    (async () => {
      const videoUrl = await fetchFreshUrl(src);
      if (destroyed || !videoUrl || !containerRef.current) return;

      // ─── Find default subtitle (prefer Indonesian) ─────
      const defaultSub = findDefaultSubtitle(subtitles);

      // ─── Build settings array ──────────────────────────
      const settingsArray: any[] = [];

      // Quality selector (custom, NOT built-in quality option)
      if (qualities.length > 1) {
        const highestRes = qualities[qualities.length - 1]?.resolution;
        settingsArray.push({
          html: 'Kualitas',
          tooltip: highestRes ? `${highestRes}p` : 'Auto',
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
          selector: qualities.map((q, i) => ({
            html: `${q.resolution}p${q.resolution >= 1080 ? ' HD' : ''}`,
            _resolution: q.resolution,
            default: i === qualities.length - 1,
          })),
          onSelect(item: any) {
            // Fetch fresh URL for selected resolution
            const proxyUrl = buildProxyUrl(srcRef.current, item._resolution);
            fetchFreshUrl(proxyUrl).then(freshUrl => {
              if (freshUrl && artRef.current) {
                artRef.current.switchQuality(freshUrl);
              }
            });
            return item.html;
          },
        });
      }

      // Subtitle language selector
      if (subtitles.length > 0) {
        const defaultSubCode = defaultSub?.code || defaultSub?.language || '';
        settingsArray.push({
          html: 'Subtitle',
          tooltip: defaultSub ? defaultSub.language : 'Off',
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h4M7 12h2m4 0h2m-4 4h4"/></svg>',
          selector: [
            { html: 'Off', default: !defaultSub },
            ...subtitles.map(sub => ({
              html: sub.language,
              url: sub.url,
              default: (sub.code === defaultSubCode || sub.language === defaultSub?.language),
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

        // Font size setting
        settingsArray.push({
          html: 'Ukuran Subtitle',
          tooltip: SUBTITLE_SIZES.find(s => s.value === subFontSize)?.html || 'Sedang',
          selector: SUBTITLE_SIZES.map(s => ({
            html: s.html, _value: s.value, default: s.value === subFontSize,
          })),
          onSelect(item: any) {
            setSubFontSize(item._value);
            saveSubStyle(item._value, subBackground, subColor);
            artRef.current?.subtitle.style({ fontSize: item._value });
            return item.html;
          },
        });

        // Background setting
        settingsArray.push({
          html: 'Background Subtitle',
          tooltip: SUBTITLE_BACKGROUNDS.find(s => s.value === subBackground)?.html || 'Tanpa Background',
          selector: SUBTITLE_BACKGROUNDS.map(s => ({
            html: s.html, _value: s.value, default: s.value === subBackground,
          })),
          onSelect(item: any) {
            setSubBackground(item._value);
            saveSubStyle(subFontSize, item._value, subColor);
            artRef.current?.subtitle.style({ backgroundColor: item._value });
            return item.html;
          },
        });

        // Color setting
        settingsArray.push({
          html: 'Warna Subtitle',
          tooltip: SUBTITLE_COLORS.find(s => s.value === subColor)?.html || 'Putih',
          selector: SUBTITLE_COLORS.map(s => ({
            html: s.html, _value: s.value, default: s.value === subColor,
          })),
          onSelect(item: any) {
            setSubColor(item._value);
            saveSubStyle(subFontSize, subBackground, item._value);
            artRef.current?.subtitle.style({ color: item._value });
            return item.html;
          },
        });
      }

      // ─── Create ArtPlayer ──────────────────────────────
      const art = new Artplayer({
        container: containerRef.current!,
        url: videoUrl,
        poster: poster || '',
        theme: '#8b5cf6',
        volume: 0.8,
        lang: 'en',

        // Built-in features
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

        // Unique ID for autoPlayback
        id: contentId || src,

        // NO built-in quality (we use custom settings instead)
        // quality: [],

        // Subtitle: default to Indonesian, strip <font> tags
        subtitle: defaultSub ? {
          url: defaultSub.url,
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
          escape: false,
          onVttLoad(vtt: string) {
            return stripFontTags(vtt);
          },
        } : {},

        // Custom settings (quality + subtitle style)
        settings: settingsArray,

        // HLS support
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
              (art as any)._hls = hls;
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = url;
            }
          },
        },
      });

      artRef.current = art;

      // Server-side progress saving
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
        if ((artRef.current as any)._hls) (artRef.current as any)._hls.destroy();
        artRef.current.destroy(false);
        artRef.current = null;
      }
    };
  }, [src, externalLoading]);

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

  return (
    <div ref={containerRef} className={`w-full aspect-video rounded-xl overflow-hidden ${className}`} />
  );
}
