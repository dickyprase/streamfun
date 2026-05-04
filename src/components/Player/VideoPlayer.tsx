'use client';

import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import * as dashjs from 'dashjs';

// ─── Types ───────────────────────────────────────────────────

export interface QualityOption {
  resolution: number;
  label: string;
  url?: string;
  isDash?: boolean;
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

// ─── Presets ─────────────────────────────────────────────────

const SUB_SIZES = [
  { html: 'Kecil', value: '16px' },
  { html: 'Sedang', value: '22px' },
  { html: 'Besar', value: '28px' },
  { html: 'Sangat Besar', value: '36px' },
];
const SUB_BGS = [
  { html: 'Tanpa Background', value: 'transparent' },
  { html: 'Semi-transparan', value: 'rgba(0,0,0,0.6)' },
  { html: 'Hitam Solid', value: 'rgba(0,0,0,0.9)' },
];
const SUB_COLORS = [
  { html: 'Putih', value: '#FFFFFF' },
  { html: 'Kuning', value: '#FFFF00' },
];

// ─── Helpers ─────────────────────────────────────────────────

async function fetchFreshUrl(proxySrc: string): Promise<{ url: string; type: string }> {
  try {
    const res = await fetch(proxySrc);
    const data = await res.json();
    if (res.ok && data.url) return { url: data.url, type: data.type || 'mp4' };
  } catch {}
  return { url: '', type: 'mp4' };
}

function buildProxyUrl(baseSrc: string, resolution: number): string {
  try {
    const url = new URL(baseSrc, window.location.origin);
    url.searchParams.set('resolution', String(resolution));
    return url.pathname + url.search;
  } catch {
    return baseSrc;
  }
}

function stripFontTags(vtt: string): string {
  return vtt.replace(/<\/?font[^>]*>/gi, '');
}

function findIndoSubtitle(subs: SubtitleOption[]): SubtitleOption | null {
  if (!subs.length) return null;
  return subs.find(s =>
    s.code === 'in_id' || s.code === 'id' || s.code === 'in' ||
    s.language?.toLowerCase().includes('indonesian') ||
    s.language?.toLowerCase().includes('indonesia')
  ) || subs[0];
}

// ─── Configure ArtPlayer globals ─────────────────────────────

if (typeof window !== 'undefined') {
  Artplayer.SEEK_STEP = 10; // Arrow keys seek 10 seconds
}

// ─── Component ───────────────────────────────────────────────

export default function VideoPlayer({
  src, poster, title,
  loading: externalLoading = false,
  qualities = [], subtitles = [],
  contentId, onTimeUpdate, className = '',
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const lastSave = useRef(0);
  const srcRef = useRef(src);

  // Subtitle style (persisted)
  const [subSize, setSubSize] = useState('22px');
  const [subBg, setSubBg] = useState('transparent');
  const [subColor, setSubColor] = useState('#FFFFFF');

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('sf-sub-style') || '{}');
      if (s.fontSize) setSubSize(s.fontSize);
      if (s.background !== undefined) setSubBg(s.background);
      if (s.color) setSubColor(s.color);
    } catch {}
  }, []);

  const saveSub = (sz: string, bg: string, cl: string) => {
    try { localStorage.setItem('sf-sub-style', JSON.stringify({ fontSize: sz, background: bg, color: cl })); } catch {}
  };

  useEffect(() => { srcRef.current = src; }, [src]);

  // ─── Init ArtPlayer ────────────────────────────────────────
  // ONLY depends on [src] - NOT externalLoading
  // This ensures player re-inits immediately when season/episode changes

  useEffect(() => {
    if (!containerRef.current || !src) return;

    // Destroy previous instance
    if (artRef.current) {
      if ((artRef.current as any)._hls) (artRef.current as any)._hls.destroy();
      if ((artRef.current as any)._dash) (artRef.current as any)._dash.destroy();
      artRef.current.destroy(false);
      artRef.current = null;
    }

    let dead = false;

    (async () => {
      const { url: videoUrl, type: videoType } = await fetchFreshUrl(src);
      if (dead || !videoUrl || !containerRef.current) return;

      const defaultSub = findIndoSubtitle(subtitles);

      // ─── Settings ──────────────────────────────────────
      const settings: any[] = [];

      // Quality selector
      if (qualities.length > 1) {
        const best = qualities[qualities.length - 1];
        settings.push({
          html: 'Kualitas',
          tooltip: `${best.resolution}p`,
          selector: qualities.map((q, i) => ({
            html: `${q.resolution}p${q.resolution >= 1080 ? ' HD' : ''}`,
            _res: q.resolution,
            default: i === qualities.length - 1,
          })),
          onSelect(item: any) {
            const proxy = buildProxyUrl(srcRef.current, item._res);
            fetchFreshUrl(proxy).then(({ url, type }) => {
              if (!url || !artRef.current) return;
              if (type === 'mpd') {
                // Switch to DASH - need to reinit dash player
                const art = artRef.current!;
                const currentTime = art.currentTime;
                const wasPlaying = art.playing;
                // Destroy existing dash/hls
                if ((art as any)._dash) { (art as any)._dash.destroy(); (art as any)._dash = null; }
                if ((art as any)._hls) { (art as any)._hls.destroy(); (art as any)._hls = null; }
                // Init new dash
                const dash = dashjs.MediaPlayer().create();
                dash.initialize(art.template.$video, url, wasPlaying);
                (art as any)._dash = dash;
                dash.on('canPlay' as any, () => {
                  art.currentTime = currentTime;
                });
                art.on('destroy', () => { dash.destroy(); });
              } else {
                // MP4 - use switchQuality (preserves time)
                artRef.current!.switchQuality(url);
              }
            });
            return item.html;
          },
        });
      }

      // Subtitle language
      if (subtitles.length > 0) {
        settings.push({
          html: 'Subtitle',
          tooltip: defaultSub?.language || 'Off',
          selector: [
            { html: 'Off', default: !defaultSub },
            ...subtitles.map(sub => ({
              html: sub.language,
              url: sub.url,
              default: sub === defaultSub,
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

        settings.push({
          html: 'Ukuran Subtitle',
          tooltip: SUB_SIZES.find(s => s.value === subSize)?.html || 'Sedang',
          selector: SUB_SIZES.map(s => ({ html: s.html, _v: s.value, default: s.value === subSize })),
          onSelect(item: any) {
            setSubSize(item._v); saveSub(item._v, subBg, subColor);
            artRef.current?.subtitle.style({ fontSize: item._v });
            return item.html;
          },
        });

        settings.push({
          html: 'Background Subtitle',
          tooltip: SUB_BGS.find(s => s.value === subBg)?.html || 'Tanpa Background',
          selector: SUB_BGS.map(s => ({ html: s.html, _v: s.value, default: s.value === subBg })),
          onSelect(item: any) {
            setSubBg(item._v); saveSub(subSize, item._v, subColor);
            artRef.current?.subtitle.style({ backgroundColor: item._v });
            return item.html;
          },
        });

        settings.push({
          html: 'Warna Subtitle',
          tooltip: SUB_COLORS.find(s => s.value === subColor)?.html || 'Putih',
          selector: SUB_COLORS.map(s => ({ html: s.html, _v: s.value, default: s.value === subColor })),
          onSelect(item: any) {
            setSubColor(item._v); saveSub(subSize, subBg, item._v);
            artRef.current?.subtitle.style({ color: item._v });
            return item.html;
          },
        });
      }

      // ─── Create ArtPlayer ──────────────────────────────
      const art = new Artplayer({
        container: containerRef.current!,
        url: videoUrl,
        ...(videoType === 'mpd' ? { type: 'mpd' } : {}),
        poster: poster || '',
        theme: '#8b5cf6',
        volume: 0.8,
        lang: 'en',

        hotkey: true,
        pip: true,
        fullscreen: true,
        fullscreenWeb: true,
        setting: true,
        playbackRate: true,
        aspectRatio: true,
        lock: true,
        gesture: true,
        fastForward: true,
        autoPlayback: true,
        autoOrientation: true,
        miniProgressBar: true,
        playsInline: true,
        mutex: true,
        backdrop: true,

        id: contentId || src,

        subtitle: defaultSub ? {
          url: defaultSub.url,
          type: 'srt',
          style: {
            color: subColor,
            fontSize: subSize,
            backgroundColor: subBg,
            padding: '4px 8px',
            borderRadius: '4px',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            bottom: '60px',
          },
          encoding: 'utf-8',
          escape: false,
          onVttLoad(vtt: string) { return stripFontTags(vtt); },
        } : {},

        settings,

        // ─── Custom type handlers ────────────────────────
        customType: {
          // HLS (.m3u8) via hls.js
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
          // DASH (.mpd) via dash.js
          mpd: function (video: HTMLVideoElement, url: string) {
            if (dashjs.supportsMediaSource()) {
              if ((art as any)._dash) (art as any)._dash.destroy();
              const dash = dashjs.MediaPlayer().create();
              dash.initialize(video, url, art.option.autoplay);
              (art as any)._dash = dash;
              art.on('destroy', () => dash.destroy());
            } else {
              art.notice.show = 'Browser tidak mendukung format DASH';
            }
          },
        },
      });

      artRef.current = art;

      // ─── Progress saving ───────────────────────────────
      if (onTimeUpdate) {
        art.on('video:timeupdate', () => {
          const now = Math.floor(art.currentTime);
          if (now > 0 && now % 10 === 0 && now !== lastSave.current) {
            lastSave.current = now;
            onTimeUpdate(art.currentTime, art.duration);
          }
        });
      }
    })();

    return () => {
      dead = true;
      if (artRef.current) {
        if ((artRef.current as any)._hls) (artRef.current as any)._hls.destroy();
        if ((artRef.current as any)._dash) (artRef.current as any)._dash.destroy();
        artRef.current.destroy(false);
        artRef.current = null;
      }
    };
  }, [src]); // ONLY depend on src - re-init when episode/season/content changes

  // ─── Render ────────────────────────────────────────────────

  if (!src) {
    return (
      <div className={`relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="text-center z-10">
          <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Memuat video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {/* Loading overlay (shown while fetching play data, doesn't block player) */}
      {externalLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="w-8 h-8 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
