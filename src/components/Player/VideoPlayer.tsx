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

interface StreamResponse {
  url: string;
  type: string;
  downloads?: { resolution: number; url: string }[];
  hasDash?: boolean;
  dashResolutions?: string;
}

async function fetchStream(proxySrc: string): Promise<StreamResponse | null> {
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

// ─── ArtPlayer globals ───────────────────────────────────────

if (typeof window !== 'undefined') {
  Artplayer.SEEK_STEP = 10;
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
  const dashRef = useRef<any>(null);
  const lastSave = useRef(0);

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

  // ─── Init ArtPlayer ────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || !src || externalLoading) return;

    // Cleanup previous
    if (dashRef.current) { try { dashRef.current.reset(); } catch {} dashRef.current = null; }
    if (artRef.current) {
      if ((artRef.current as any)._hls) (artRef.current as any)._hls.destroy();
      artRef.current.destroy(false);
      artRef.current = null;
    }

    let dead = false;

    (async () => {
      // Fetch stream info (URL + type + available downloads)
      const stream = await fetchStream(src);
      if (dead || !stream || !containerRef.current) return;

      const { url: videoUrl, type: videoType, downloads = [], hasDash, dashResolutions } = stream;
      const defaultSub = findIndoSubtitle(subtitles);

      // ─── Build quality list for settings ───────────────
      // Combine: MP4 downloads + DASH ABR option
      const qualityItems: any[] = [];

      if (hasDash) {
        qualityItems.push({
          html: 'Auto (ABR)',
          _type: 'dash',
          default: true,
        });
      }

      // Add MP4 direct downloads
      downloads.forEach((dl: any) => {
        qualityItems.push({
          html: `${dl.resolution}p`,
          _type: 'mp4',
          _url: dl.url,
          _res: dl.resolution,
          default: !hasDash && dl.resolution === downloads[downloads.length - 1]?.resolution,
        });
      });

      // Add DASH resolution labels (for display, handled by ABR)
      if (hasDash && dashResolutions) {
        const dashRes = dashResolutions.split(',').map((r: string) => parseInt(r)).filter((r: number) => r > 0);
        dashRes.forEach((res: number) => {
          if (!qualityItems.find((q: any) => q._res === res)) {
            qualityItems.push({
              html: `${res}p${res >= 1080 ? ' HD' : ''}`,
              _type: 'dash-force',
              _res: res,
              default: false,
            });
          }
        });
      }

      // Sort: Auto first, then by resolution
      qualityItems.sort((a: any, b: any) => {
        if (a._type === 'dash') return -1;
        if (b._type === 'dash') return 1;
        return (a._res || 0) - (b._res || 0);
      });

      // ─── Settings array ────────────────────────────────
      const settings: any[] = [];

      // Quality
      if (qualityItems.length > 1) {
        settings.push({
          html: 'Kualitas',
          tooltip: hasDash ? 'Auto (ABR)' : `${downloads[downloads.length - 1]?.resolution || 360}p`,
          selector: qualityItems,
          onSelect(item: any) {
            const art = artRef.current;
            if (!art) return item.html;

            if (item._type === 'dash') {
              // Switch back to DASH ABR
              if (!dashRef.current && videoType === 'mpd') {
                const dash = dashjs.MediaPlayer().create();
                dash.initialize(art.template.$video, videoUrl, true);
                dashRef.current = dash;
              } else if (dashRef.current) {
                // Re-enable ABR
                dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
              }
              return item.html;
            }

            if (item._type === 'dash-force' && dashRef.current) {
              // Force specific DASH quality
              const bitrateList = dashRef.current.getBitrateInfoListFor?.('video') || [];
              const idx = bitrateList.findIndex((b: any) => b.height === item._res);
              if (idx >= 0) {
                dashRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
                dashRef.current.setQualityFor('video', idx);
              }
              return item.html;
            }

            if (item._type === 'mp4' && item._url) {
              // Switch to direct MP4 - detach dash.js
              if (dashRef.current) { try { dashRef.current.reset(); } catch {} dashRef.current = null; }
              art.switchQuality(item._url);
              return item.html;
            }

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
            if (item.html === 'Off') { artRef.current!.subtitle.show = false; return item.html; }
            artRef.current!.subtitle.show = true;
            artRef.current!.subtitle.switch(item.url, { name: item.html });
            return item.html;
          },
        });

        // Subtitle style settings
        settings.push({
          html: 'Ukuran Subtitle',
          tooltip: SUB_SIZES.find(s => s.value === subSize)?.html || 'Sedang',
          selector: SUB_SIZES.map(s => ({ html: s.html, _v: s.value, default: s.value === subSize })),
          onSelect(item: any) { setSubSize(item._v); saveSub(item._v, subBg, subColor); artRef.current?.subtitle.style({ fontSize: item._v }); return item.html; },
        });
        settings.push({
          html: 'Background Subtitle',
          tooltip: SUB_BGS.find(s => s.value === subBg)?.html || 'Tanpa Background',
          selector: SUB_BGS.map(s => ({ html: s.html, _v: s.value, default: s.value === subBg })),
          onSelect(item: any) { setSubBg(item._v); saveSub(subSize, item._v, subColor); artRef.current?.subtitle.style({ backgroundColor: item._v }); return item.html; },
        });
        settings.push({
          html: 'Warna Subtitle',
          tooltip: SUB_COLORS.find(s => s.value === subColor)?.html || 'Putih',
          selector: SUB_COLORS.map(s => ({ html: s.html, _v: s.value, default: s.value === subColor })),
          onSelect(item: any) { setSubColor(item._v); saveSub(subSize, subBg, item._v); artRef.current?.subtitle.style({ color: item._v }); return item.html; },
        });
      }

      // ─── DASH playback handler ─────────────────────────
      function playDash(video: HTMLVideoElement, url: string, art: any) {
        if (dashRef.current) { try { dashRef.current.reset(); } catch {} }

        const player = dashjs.MediaPlayer().create();
        player.updateSettings({
          streaming: {
            abr: { autoSwitchBitrate: { video: true, audio: true } },
            buffer: { fastSwitchEnabled: true },
          },
        });
        player.initialize(video, url, false);

        player.on(dashjs.MediaPlayer.events.ERROR as any, (e: any) => {
          console.error('[DASH] Error:', e.error?.message || e);
          // Fallback to MP4 if DASH fails
          if (downloads.length > 0) {
            const best = downloads.sort((a: any, b: any) => b.resolution - a.resolution)[0];
            art.notice.show = 'DASH gagal, beralih ke MP4...';
            setTimeout(() => {
              player.reset();
              dashRef.current = null;
              art.url = best.url;
            }, 1000);
          }
        });

        dashRef.current = player;
        art.on('destroy', () => { try { player.reset(); } catch {} });
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
            color: subColor, fontSize: subSize, backgroundColor: subBg,
            padding: '4px 8px', borderRadius: '4px',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)', bottom: '60px',
          },
          encoding: 'utf-8',
          escape: false,
          onVttLoad(vtt: string) { return stripFontTags(vtt); },
        } : {},

        settings,

        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            if (Hls.isSupported()) {
              const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
              hls.loadSource(url); hls.attachMedia(video);
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
          mpd: playDash,
        },
      });

      artRef.current = art;

      // Progress saving
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
      if (dashRef.current) { try { dashRef.current.reset(); } catch {} dashRef.current = null; }
      if (artRef.current) {
        if ((artRef.current as any)._hls) (artRef.current as any)._hls.destroy();
        artRef.current.destroy(false);
        artRef.current = null;
      }
    };
  }, [src, externalLoading]);

  // ─── Render ────────────────────────────────────────────────

  if (!src) {
    return (
      <div className={`relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center ${className}`}>
        <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-video rounded-xl overflow-hidden ${className}`}>
      <div ref={containerRef} className="w-full h-full" />
      {externalLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="w-8 h-8 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
