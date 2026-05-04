'use client';

/**
 * VideoPlayer - Routes between Shaka Player (DASH/HEVC) and ArtPlayer (MP4)
 *
 * Strategy:
 * - If DASH URL available → use Shaka Player (handles HEVC/DASH natively)
 * - If only MP4 → use ArtPlayer (quality switch, subtitles, settings)
 * - Fallback: if Shaka fails → switch to ArtPlayer with MP4
 */

import { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import dynamic from 'next/dynamic';

const ShakaPlayer = dynamic(() => import('./ShakaPlayer'), { ssr: false });

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

// ─── Helpers ─────────────────────────────────────────────────

interface StreamInfo {
  url: string;
  type: string;
  resolution: number;
  codec: string;
  dashUrl: string;
  dashCodec: string;
  dashResolutions: string;
  availableQualities: { resolution: number; codec: string }[];
}

async function fetchStreamInfo(proxySrc: string): Promise<StreamInfo | null> {
  try {
    const res = await fetch(proxySrc);
    const data = await res.json();
    if (res.ok && data.url) return data;
  } catch {}
  return null;
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

function buildProxyUrl(baseSrc: string, resolution: number): string {
  try {
    const url = new URL(baseSrc, window.location.origin);
    url.searchParams.set('resolution', String(resolution));
    return url.pathname + url.search;
  } catch { return baseSrc; }
}

const SUB_SIZES = [
  { html: 'Kecil', value: '16px' }, { html: 'Sedang', value: '22px' },
  { html: 'Besar', value: '28px' }, { html: 'Sangat Besar', value: '36px' },
];
const SUB_BGS = [
  { html: 'Tanpa Background', value: 'transparent' },
  { html: 'Semi-transparan', value: 'rgba(0,0,0,0.6)' },
  { html: 'Hitam Solid', value: 'rgba(0,0,0,0.9)' },
];
const SUB_COLORS = [
  { html: 'Putih', value: '#FFFFFF' }, { html: 'Kuning', value: '#FFFF00' },
];

if (typeof window !== 'undefined') { Artplayer.SEEK_STEP = 10; }

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

  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [resolving, setResolving] = useState(false);
  const [useShakaPlayer, setUseShakaPlayer] = useState(false);
  const [shakaFailed, setShakaFailed] = useState(false);

  // Subtitle style
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

  // ─── Fetch stream info ─────────────────────────────────────

  useEffect(() => {
    if (!src || externalLoading) { setStreamInfo(null); return; }
    let dead = false;
    setResolving(true);
    setShakaFailed(false);

    (async () => {
      const info = await fetchStreamInfo(src);
      if (dead) return;
      setStreamInfo(info);

      // Use Shaka Player if DASH URL is available
      if (info?.dashUrl) {
        setUseShakaPlayer(true);
      } else {
        setUseShakaPlayer(false);
      }
      setResolving(false);
    })();

    return () => { dead = true; };
  }, [src, externalLoading]);

  // ─── Init ArtPlayer (MP4 mode / fallback) ──────────────────

  useEffect(() => {
    // Only init ArtPlayer if NOT using Shaka, or if Shaka failed
    if (!containerRef.current || !streamInfo || (useShakaPlayer && !shakaFailed) || externalLoading) return;

    if (artRef.current) {
      if ((artRef.current as any)._hls) (artRef.current as any)._hls.destroy();
      artRef.current.destroy(false);
      artRef.current = null;
    }

    const videoUrl = streamInfo.url;
    if (!videoUrl) return;

    const defaultSub = findIndoSubtitle(subtitles);
    const settings: any[] = [];

    // Quality
    const mp4Qualities = (streamInfo.availableQualities || []).filter(q => q.resolution > 0);
    if (mp4Qualities.length > 1) {
      settings.push({
        html: 'Kualitas',
        tooltip: `${streamInfo.resolution || mp4Qualities[mp4Qualities.length - 1]?.resolution}p`,
        selector: mp4Qualities.map(q => ({
          html: `${q.resolution}p${q.resolution >= 1080 ? ' HD' : ''}`,
          _res: q.resolution,
          default: q.resolution === (streamInfo as any).resolution,
        })),
        onSelect(item: any) {
          const proxy = buildProxyUrl(srcRef.current, item._res);
          fetchStreamInfo(proxy).then(info => {
            if (info?.url && artRef.current) artRef.current.switchQuality(info.url);
          });
          return item.html;
        },
      });
    }

    // Subtitle
    if (subtitles.length > 0) {
      settings.push({
        html: 'Subtitle', tooltip: defaultSub?.language || 'Off',
        selector: [
          { html: 'Off', default: !defaultSub },
          ...subtitles.map(sub => ({ html: sub.language, url: sub.url, default: sub === defaultSub })),
        ],
        onSelect(item: any) {
          if (item.html === 'Off') { artRef.current!.subtitle.show = false; return item.html; }
          artRef.current!.subtitle.show = true;
          artRef.current!.subtitle.switch(item.url, { name: item.html });
          return item.html;
        },
      });
      settings.push({ html: 'Ukuran Subtitle', tooltip: SUB_SIZES.find(s => s.value === subSize)?.html || 'Sedang', selector: SUB_SIZES.map(s => ({ html: s.html, _v: s.value, default: s.value === subSize })), onSelect(item: any) { setSubSize(item._v); saveSub(item._v, subBg, subColor); artRef.current?.subtitle.style({ fontSize: item._v }); return item.html; } });
      settings.push({ html: 'Background Subtitle', tooltip: SUB_BGS.find(s => s.value === subBg)?.html || 'Tanpa Background', selector: SUB_BGS.map(s => ({ html: s.html, _v: s.value, default: s.value === subBg })), onSelect(item: any) { setSubBg(item._v); saveSub(subSize, item._v, subColor); artRef.current?.subtitle.style({ backgroundColor: item._v }); return item.html; } });
      settings.push({ html: 'Warna Subtitle', tooltip: SUB_COLORS.find(s => s.value === subColor)?.html || 'Putih', selector: SUB_COLORS.map(s => ({ html: s.html, _v: s.value, default: s.value === subColor })), onSelect(item: any) { setSubColor(item._v); saveSub(subSize, subBg, item._v); artRef.current?.subtitle.style({ color: item._v }); return item.html; } });
    }

    const art = new Artplayer({
      container: containerRef.current!,
      url: videoUrl, poster: poster || '', theme: '#8b5cf6', volume: 0.8, lang: 'en',
      hotkey: true, pip: true, fullscreen: true, fullscreenWeb: true,
      setting: true, playbackRate: true, aspectRatio: true,
      lock: true, gesture: true, fastForward: true,
      autoPlayback: true, autoOrientation: true, miniProgressBar: true,
      playsInline: true, mutex: true, backdrop: true,
      id: contentId || src,
      subtitle: defaultSub ? {
        url: defaultSub.url, type: 'srt',
        style: { color: subColor, fontSize: subSize, backgroundColor: subBg, padding: '4px 8px', borderRadius: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.8)', bottom: '60px' },
        encoding: 'utf-8', escape: false,
        onVttLoad(vtt: string) { return stripFontTags(vtt); },
      } : {},
      settings,
      customType: {
        m3u8: function (video: HTMLVideoElement, url: string) {
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
            hls.loadSource(url); hls.attachMedia(video);
            (art as any)._hls = hls;
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
        },
      },
    });

    artRef.current = art;

    if (onTimeUpdate) {
      art.on('video:timeupdate', () => {
        const now = Math.floor(art.currentTime);
        if (now > 0 && now % 10 === 0 && now !== lastSave.current) {
          lastSave.current = now; onTimeUpdate(art.currentTime, art.duration);
        }
      });
    }

    return () => {
      if (artRef.current) {
        if ((artRef.current as any)._hls) (artRef.current as any)._hls.destroy();
        artRef.current.destroy(false); artRef.current = null;
      }
    };
  }, [streamInfo, useShakaPlayer, shakaFailed, externalLoading]);

  // ─── Render ────────────────────────────────────────────────

  if (!src || externalLoading || resolving) {
    return (
      <div className={`relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        {poster && <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
        <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Shaka Player mode (DASH/HEVC)
  if (useShakaPlayer && !shakaFailed && streamInfo?.dashUrl) {
    return (
      <div className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden ${className}`}>
        <ShakaPlayer
          manifestUrl={streamInfo.dashUrl}
          poster={poster}
          onReady={() => console.log('[VideoPlayer] Shaka ready')}
          onError={(msg) => {
            console.error('[VideoPlayer] Shaka failed:', msg);
            // Fallback to ArtPlayer with MP4
            setShakaFailed(true);
          }}
          onTimeUpdate={onTimeUpdate}
        />
      </div>
    );
  }

  // ArtPlayer mode (MP4 / fallback)
  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
