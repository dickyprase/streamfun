'use client';

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

async function fetchFreshUrl(proxySrc: string): Promise<string> {
  try {
    const res = await fetch(proxySrc);
    const data = await res.json();
    if (res.ok && data.url) return data.url;
  } catch {}
  return '';
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

  useEffect(() => {
    if (!containerRef.current || !src || externalLoading) return;

    if (artRef.current) {
      artRef.current.destroy(false);
      artRef.current = null;
    }

    let dead = false;

    (async () => {
      const videoUrl = await fetchFreshUrl(src);
      if (dead || !videoUrl || !containerRef.current) return;

      const defaultSub = findIndoSubtitle(subtitles);

      // ─── Settings array ────────────────────────────────
      const settings: any[] = [];

      // Quality
      if (qualities.length > 1) {
        const best = qualities[qualities.length - 1];
        settings.push({
          html: 'Kualitas',
          tooltip: `${best.resolution}p`,
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
          selector: qualities.map((q, i) => ({
            html: `${q.resolution}p${q.resolution >= 1080 ? ' HD' : ''}`,
            _res: q.resolution,
            default: i === qualities.length - 1,
          })),
          onSelect(item: any) {
            const art = artRef.current;
            if (!art) return item.html;
            const currentTime = art.currentTime;
            const wasPlaying = art.playing;
            const proxy = buildProxyUrl(srcRef.current, item._res);
            fetchFreshUrl(proxy).then(url => {
              if (!url || !artRef.current) return;
              // Directly set URL and restore position
              artRef.current.once('video:canplay', () => {
                artRef.current!.currentTime = currentTime;
                if (wasPlaying) artRef.current!.play();
              });
              artRef.current.url = url;
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
          icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h4M7 12h2m4 0h2m-4 4h4"/></svg>',
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

        // Font size
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

        // Background
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

        // Color
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

      // ─── Double-tap seek layers ────────────────────────
      const doubleTapCSS = `
        display:flex;align-items:center;justify-content:center;
        width:50%;height:100%;position:absolute;top:0;
        cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;
      `;
      const rippleCSS = `
        position:absolute;width:80px;height:80px;border-radius:50%;
        background:rgba(255,255,255,0.2);transform:scale(0);
        animation:artTapRipple 0.5s ease-out;pointer-events:none;
      `;
      const rippleKeyframes = `
        @keyframes artTapRipple {
          0% { transform:scale(0); opacity:1; }
          100% { transform:scale(2.5); opacity:0; }
        }
      `;

      // ─── Create ArtPlayer ──────────────────────────────
      const art = new Artplayer({
        container: containerRef.current!,
        url: videoUrl,
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

        // Double-tap seek zones as layers
        layers: [
          {
            name: 'doubleTapLeft',
            html: `<style>${rippleKeyframes}</style><div style="${doubleTapCSS}left:0;"></div>`,
            disable: false,
            click: function () {
              // Single tap on left side does nothing visible
            },
          },
          {
            name: 'doubleTapRight',
            html: `<div style="${doubleTapCSS}right:0;"></div>`,
            disable: false,
            click: function () {
              // Single tap on right side does nothing visible
            },
          },
        ],

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

      // ─── Double-tap seek logic ─────────────────────────
      let lastTapTime = 0;
      let lastTapSide: 'left' | 'right' | null = null;

      const handleDoubleTap = (e: MouseEvent | TouchEvent) => {
        const rect = art.template.$player.getBoundingClientRect();
        const clientX = 'touches' in e
          ? (e as TouchEvent).changedTouches[0]?.clientX
          : (e as MouseEvent).clientX;
        const relX = (clientX - rect.left) / rect.width;
        const now = Date.now();
        const side = relX < 0.4 ? 'left' : relX > 0.6 ? 'right' : null;

        if (side && lastTapSide === side && now - lastTapTime < 350) {
          // Double tap detected
          const seekAmount = side === 'left' ? -10 : 10;
          art.currentTime = Math.max(0, Math.min(art.currentTime + seekAmount, art.duration));

          // Show ripple feedback
          const indicator = document.createElement('div');
          indicator.innerHTML = `
            <div style="${rippleCSS}"></div>
            <span style="color:white;font-size:14px;font-weight:bold;z-index:1;text-shadow:0 1px 3px rgba(0,0,0,0.5);">
              ${side === 'left' ? '⏪' : '⏩'} ${Math.abs(seekAmount)}s
            </span>
          `;
          indicator.style.cssText = `
            position:absolute;top:50%;${side}:15%;transform:translateY(-50%);
            display:flex;flex-direction:column;align-items:center;gap:4px;
            pointer-events:none;z-index:50;
          `;
          art.template.$player.appendChild(indicator);
          setTimeout(() => indicator.remove(), 600);

          lastTapTime = 0;
          lastTapSide = null;
        } else {
          lastTapTime = now;
          lastTapSide = side;
        }
      };

      art.template.$video.addEventListener('click', handleDoubleTap);
      art.template.$video.addEventListener('touchend', handleDoubleTap);

      // ─── Fullscreen → landscape ────────────────────────
      art.on('fullscreen', (state: boolean) => {
        try {
          if (state) {
            (screen.orientation as any)?.lock?.('landscape').catch(() => {});
          } else {
            (screen.orientation as any)?.unlock?.();
          }
        } catch {}
      });

      art.on('fullscreenWeb', (state: boolean) => {
        try {
          if (state) {
            (screen.orientation as any)?.lock?.('landscape').catch(() => {});
          } else {
            (screen.orientation as any)?.unlock?.();
          }
        } catch {}
      });

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
        artRef.current.destroy(false);
        artRef.current = null;
      }
    };
  }, [src, externalLoading]);

  // ─── Loading ───────────────────────────────────────────────

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

  return <div ref={containerRef} className={`w-full aspect-video rounded-xl overflow-hidden ${className}`} />;
}
