'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import shaka from 'shaka-player';

interface ShakaPlayerProps {
  manifestUrl: string;
  poster?: string;
  autoPlay?: boolean;
  onReady?: () => void;
  onError?: (msg: string) => void;
  onTimeUpdate?: (time: number, duration: number) => void;
}

const ShakaPlayer = forwardRef<{ video: () => HTMLVideoElement | null }, ShakaPlayerProps>(
  function ShakaPlayer({ manifestUrl, poster, autoPlay = false, onReady, onError, onTimeUpdate }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<shaka.Player | null>(null);

    useImperativeHandle(ref, () => ({ video: () => videoRef.current }));

    useEffect(() => {
      if (!manifestUrl) return;

      let destroyed = false;

      const initPlayer = async () => {
        shaka.polyfill.installAll();

        if (!shaka.Player.isBrowserSupported()) {
          onError?.('Browser tidak mendukung Shaka Player');
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        // Destroy previous instance
        if (playerRef.current) {
          await playerRef.current.destroy();
          playerRef.current = null;
        }

        const player = new shaka.Player(video);
        playerRef.current = player;

        player.addEventListener('error', (event: any) => {
          const detail = event.detail;
          console.error('[ShakaPlayer] Error:', detail.code, detail);
          onError?.(`Error ${detail.code}: ${detail.message || 'Unknown error'}`);
        });

        try {
          await player.load(manifestUrl);
          if (destroyed) return;

          // Log active tracks info
          const variantTracks = player.getVariantTracks();
          const activeTracks = variantTracks.filter((t: any) => t.active);
          console.log('[ShakaPlayer] ✅ Video loaded successfully!');
          console.log('[ShakaPlayer] Available tracks:', variantTracks.map((t: any) => `${t.height}p ${t.videoCodec} ${Math.round(t.bandwidth/1000)}kbps`));
          console.log('[ShakaPlayer] Active track:', activeTracks.map((t: any) => `${t.height}p ${t.videoCodec} ${Math.round(t.bandwidth/1000)}kbps`));

          // Log when ABR switches quality
          player.addEventListener('adaptation', () => {
            const active = player.getVariantTracks().filter((t: any) => t.active);
            if (active.length > 0) {
              const t = active[0];
              console.log(`[ShakaPlayer] 🔄 ABR switched to: ${t.height}p ${t.videoCodec} ${Math.round(t.bandwidth/1000)}kbps`);
            }
          });

          onReady?.();
          if (autoPlay) video.play().catch(() => {});
        } catch (e: any) {
          if (destroyed) return;
          console.error('[ShakaPlayer] Failed to load:', e);
          onError?.(e.message || 'Failed to load video');
        }
      };

      initPlayer();

      return () => {
        destroyed = true;
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [manifestUrl]);

    // Time update callback
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !onTimeUpdate) return;

      const handler = () => {
        onTimeUpdate(video.currentTime, video.duration || 0);
      };
      video.addEventListener('timeupdate', handler);
      return () => video.removeEventListener('timeupdate', handler);
    }, [onTimeUpdate]);

    return (
      <video
        ref={videoRef}
        controls
        playsInline
        poster={poster}
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
      />
    );
  }
);

export default ShakaPlayer;
