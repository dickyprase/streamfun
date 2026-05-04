'use client';

/**
 * H265 DASH Player - Transcodes HEVC→H.264 via FFmpeg WASM
 *
 * Flow:
 * 1. Fetch DASH manifest (.mpd)
 * 2. Parse → extract segment URLs
 * 3. Download segments (.m4s)
 * 4. Transcode HEVC→H.264 via FFmpeg WASM (multi-worker)
 * 5. Feed transcoded chunks to MediaSource API
 * 6. Play starts when first chunk is ready
 */

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { parseMpd, type DashRepresentation } from '@/utils/dashParser';

// ─── Config ──────────────────────────────────────────────────

const WORKER_POOL_SIZE = 4;
const CHUNK_GROUP_SIZE = 3; // segments per transcode chunk
const DOWNLOAD_CONCURRENCY = 6;

// FFmpeg WASM CDN URLs
const FFMPEG_CDN = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
const FFMPEG_MT_CDN = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd';

const isMT = () => typeof SharedArrayBuffer !== 'undefined';

// ─── FFmpeg Loader ───────────────────────────────────────────

async function loadFfmpeg(): Promise<FFmpeg> {
  const mt = isMT();
  const cdn = mt ? FFMPEG_MT_CDN : FFMPEG_CDN;

  const opts: any = {
    coreURL: await toBlobURL(`${cdn}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${cdn}/ffmpeg-core.wasm`, 'application/wasm'),
  };
  if (mt) {
    opts.workerURL = await toBlobURL(`${cdn}/ffmpeg-core.worker.js`, 'text/javascript');
  }

  const ff = new FFmpeg();
  await ff.load(opts);
  return ff;
}

// ─── Segment Downloader ──────────────────────────────────────

async function downloadSegments(
  urls: string[],
  onProgress: (pct: number) => void
): Promise<Uint8Array[]> {
  const results: Uint8Array[] = new Array(urls.length);
  let completed = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < urls.length) {
      const i = cursor++;
      if (i >= urls.length) break;
      try {
        const res = await fetch(urls[i], { signal: AbortSignal.timeout(30000) });
        results[i] = new Uint8Array(await res.arrayBuffer());
      } catch {
        results[i] = new Uint8Array(0);
      }
      completed++;
      onProgress(Math.round((completed / urls.length) * 100));
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, urls.length) }, worker)
  );
  return results;
}

// ─── Detect supported MIME type ──────────────────────────────

function detectMimeType(): string {
  const candidates = [
    'video/mp4; codecs="avc1.64001F,mp4a.40.2"',
    'video/mp4; codecs="avc1.4D401F,mp4a.40.2"',
    'video/mp4; codecs="avc1.42E01F,mp4a.40.2"',
    'video/mp4; codecs="avc1.42E01E,mp4a.40.2"',
  ];
  return candidates.find(m => MediaSource.isTypeSupported(m))
    ?? 'video/mp4; codecs="avc1.42E01E,mp4a.40.2"';
}

// ─── Build FFmpeg args for DASH segments ─────────────────────

function buildExecArgs(inputName: string, outName: string): string[] {
  return [
    '-i', inputName,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '28',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '96k',
    '-ar', '44100',
    '-threads', '1',
    '-avoid_negative_ts', 'make_zero',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    '-f', 'mp4',
    outName,
  ];
}

// ─── Props ───────────────────────────────────────────────────

interface H265DashPlayerProps {
  /** DASH manifest URL (.mpd) */
  manifestUrl: string;
  /** Poster image */
  poster?: string;
  /** Preferred representation (by height, e.g. 1080) */
  preferredHeight?: number;
  /** Callbacks */
  onReady?: () => void;
  onError?: (msg: string) => void;
  onTimeUpdate?: (time: number, duration: number) => void;
}

// ─── Component ───────────────────────────────────────────────

const H265DashPlayer = forwardRef<{ video: () => HTMLVideoElement | null }, H265DashPlayerProps>(
  function H265DashPlayer({ manifestUrl, poster, preferredHeight = 720, onReady, onError, onTimeUpdate }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const queueRef = useRef<ArrayBuffer[]>([]);
    const appendingRef = useRef(false);
    const totalDurationRef = useRef(0);

    const [phase, setPhase] = useState<string>('init');
    const [downloadPct, setDownloadPct] = useState(0);
    const [transcodePct, setTranscodePct] = useState(0);
    const [chunksDone, setChunksDone] = useState(0);
    const [totalChunks, setTotalChunks] = useState(0);

    const hasStartedRef = useRef(false);
    const [hasStarted, setHasStarted] = useState(false);

    useImperativeHandle(ref, () => ({ video: () => videoRef.current }));

    function appendNext() {
      if (appendingRef.current) return;
      if (!queueRef.current.length) return;
      const sb = sourceBufferRef.current;
      if (!sb || sb.updating) return;
      appendingRef.current = true;
      sb.appendBuffer(queueRef.current.shift()!);
    }

    useEffect(() => {
      if (!manifestUrl) return;
      let cancelled = false;
      const allFfmpegs: FFmpeg[] = [];

      setPhase('init');
      setDownloadPct(0);
      setTranscodePct(0);
      setChunksDone(0);
      setTotalChunks(0);
      setHasStarted(false);
      hasStartedRef.current = false;
      queueRef.current = [];
      appendingRef.current = false;

      const run = async () => {
        try {
          // ─── 1. Load FFmpeg + Fetch manifest ─────────────
          setPhase('loading-ffmpeg');

          const [firstFf, mpdRes] = await Promise.all([
            loadFfmpeg(),
            fetch(manifestUrl, { signal: AbortSignal.timeout(10000) }),
          ]);
          allFfmpegs.push(firstFf);
          if (cancelled) return;

          const mpdText = await mpdRes.text();
          const manifest = parseMpd(mpdText, manifestUrl);

          if (!manifest.representations.length) {
            throw new Error('No video representations found in manifest');
          }

          // Pick best representation (closest to preferredHeight)
          const rep = manifest.representations.reduce((best, r) =>
            Math.abs(r.height - preferredHeight) < Math.abs(best.height - preferredHeight) ? r : best
          );

          // Also get audio representation
          const audioRep = manifest.audioRepresentation;

          totalDurationRef.current = manifest.duration;
          console.log(`[H265Dash] Selected: ${rep.width}x${rep.height} codec=${rep.codec} segments=${rep.segments.length}`);

          // ─── 2. Download segments ────────────────────────
          setPhase('downloading');

          // Combine video + audio segment URLs
          const videoUrls = rep.segments.map(s => s.url);
          const audioUrls = audioRep ? audioRep.segments.map(s => s.url) : [];

          const [videoData, audioData] = await Promise.all([
            downloadSegments(videoUrls, pct => { if (!cancelled) setDownloadPct(pct); }),
            audioUrls.length > 0
              ? downloadSegments(audioUrls, () => {})
              : Promise.resolve([] as Uint8Array[]),
          ]);

          if (cancelled) return;

          // ─── 3. Setup MediaSource ────────────────────────
          const ms = new MediaSource();
          mediaSourceRef.current = ms;
          videoRef.current!.src = URL.createObjectURL(ms);
          await new Promise<void>(r => ms.addEventListener('sourceopen', r as any, { once: true }));
          if (cancelled) return;

          const mimeType = detectMimeType();
          const sb = ms.addSourceBuffer(mimeType);
          sourceBufferRef.current = sb;
          sb.mode = 'sequence';

          // ─── 4. Build chunk groups ───────────────────────
          // Group segments (skip init segment for grouping)
          const mediaSegments = videoData.filter((_, i) => !rep.segments[i]?.isInit);
          const initSegment = videoData.find((_, i) => rep.segments[i]?.isInit);
          const audioInit = audioData.length > 0 ? audioData.find((_, i) => audioRep!.segments[i]?.isInit) : null;
          const audioMedia = audioData.filter((_, i) => !audioRep?.segments[i]?.isInit);

          const numChunks = Math.ceil(mediaSegments.length / CHUNK_GROUP_SIZE);
          setTotalChunks(numChunks);

          // ─── 5. Load extra workers ───────────────────────
          const extraCount = Math.min(WORKER_POOL_SIZE - 1, numChunks - 1);
          if (extraCount > 0) {
            const extras = await Promise.all(Array.from({ length: extraCount }, () => loadFfmpeg()));
            extras.forEach(f => allFfmpegs.push(f));
          }
          if (cancelled) return;

          // ─── 6. Transcode chunks ─────────────────────────
          setPhase('transcoding');

          let nextIdx = 0;
          let doneCount = 0;
          let flushPointer = 0;
          const results: (ArrayBuffer | null)[] = new Array(numChunks).fill(null);
          const chunkProgress = new Array(numChunks).fill(0);

          const updateProgress = () => {
            const sum = chunkProgress.reduce((a: number, b: number) => a + b, 0);
            setTranscodePct(Math.min(100, Math.round((sum / numChunks) * 100)));
          };

          const tryStartPlayback = () => {
            if (hasStartedRef.current) return;
            if (!videoRef.current?.buffered?.length) return;
            hasStartedRef.current = true;
            setHasStarted(true);
            videoRef.current.play().catch(() => {});
            onReady?.();
          };

          const flushReadyChunks = () => {
            while (flushPointer < numChunks && results[flushPointer] !== null) {
              if (results[flushPointer]!.byteLength > 0) {
                queueRef.current.push(results[flushPointer]!);
              }
              flushPointer++;
            }
            appendNext();
            if (flushPointer >= numChunks && !queueRef.current.length && !appendingRef.current) {
              try { ms.endOfStream(); } catch {}
              setPhase('done');
              tryStartPlayback();
            }
          };

          sb.addEventListener('updateend', () => {
            appendingRef.current = false;
            tryStartPlayback();
            appendNext();
            if (flushPointer >= numChunks && !queueRef.current.length && !appendingRef.current) {
              try { ms.endOfStream(); } catch {}
              setPhase('done');
            }
          });

          const transcodeChunk = async (ff: FFmpeg, chunkIdx: number) => {
            if (cancelled) return;
            const startSeg = chunkIdx * CHUNK_GROUP_SIZE;
            const endSeg = Math.min(startSeg + CHUNK_GROUP_SIZE, mediaSegments.length);
            const inputName = `input_${chunkIdx}.mp4`;
            const outName = `out_${chunkIdx}.mp4`;

            // Concatenate init + media segments into one input file
            const parts: Uint8Array[] = [];
            if (initSegment) parts.push(initSegment);
            for (let i = startSeg; i < endSeg; i++) {
              if (mediaSegments[i]?.length > 0) parts.push(mediaSegments[i]);
            }

            // Add audio if available
            if (audioInit) parts.push(audioInit);
            for (let i = startSeg; i < endSeg && i < audioMedia.length; i++) {
              if (audioMedia[i]?.length > 0) parts.push(audioMedia[i]);
            }

            const totalSize = parts.reduce((s, p) => s + p.length, 0);
            const combined = new Uint8Array(totalSize);
            let offset = 0;
            for (const part of parts) {
              combined.set(part, offset);
              offset += part.length;
            }

            await ff.writeFile(inputName, combined);

            try {
              const onProg = ({ progress }: { progress: number }) => {
                if (progress >= 0 && progress <= 1) {
                  chunkProgress[chunkIdx] = progress;
                  updateProgress();
                }
              };
              ff.on('progress', onProg);
              await ff.exec(buildExecArgs(inputName, outName));
              ff.off('progress', onProg);

              if (cancelled) return;

              const out = await ff.readFile(outName);
              const outArr = out as Uint8Array;

              if (outArr.byteLength < 500) {
                results[chunkIdx] = new ArrayBuffer(0);
              } else {
                // Copy to a regular ArrayBuffer (may be SharedArrayBuffer in MT mode)
                const copy = new ArrayBuffer(outArr.byteLength);
                new Uint8Array(copy).set(outArr);
                results[chunkIdx] = copy;
              }
            } catch (err: any) {
              console.warn(`[H265Dash] chunk ${chunkIdx} error:`, err.message);
              results[chunkIdx] = new ArrayBuffer(0);
            }

            // Cleanup
            try { await ff.deleteFile(inputName); } catch {}
            try { await ff.deleteFile(outName); } catch {}

            chunkProgress[chunkIdx] = 1;
            updateProgress();
            doneCount++;
            setChunksDone(doneCount);
            flushReadyChunks();
          };

          const workerLoop = async (ff: FFmpeg) => {
            while (!cancelled) {
              const idx = nextIdx++;
              if (idx >= numChunks) return;
              await transcodeChunk(ff, idx);
            }
          };

          await Promise.all(allFfmpegs.map(ff => workerLoop(ff)));
          if (!cancelled) flushReadyChunks();

        } catch (err: any) {
          if (!cancelled) {
            setPhase('error');
            onError?.(err.message);
            console.error('[H265Dash] fatal:', err);
          }
        }
      };

      run();

      return () => {
        cancelled = true;
        allFfmpegs.forEach(ff => { try { ff.terminate(); } catch {} });
        try { mediaSourceRef.current?.endOfStream(); } catch {}
        if (videoRef.current) videoRef.current.src = '';
      };
    }, [manifestUrl]);

    // ─── Render ──────────────────────────────────────────────

    const phaseLabel: Record<string, string> = {
      init: '',
      'loading-ffmpeg': 'Loading decoder WASM...',
      downloading: `Downloading segments... ${downloadPct}%`,
      transcoding: `Transcoding (${chunksDone}/${totalChunks})... ${transcodePct}%`,
      done: '',
      error: 'Gagal memproses video',
    };

    const showOverlay = !['done', 'init', 'error'].includes(phase) && !hasStarted;
    const barPct = phase === 'downloading' ? downloadPct : phase === 'transcoding' ? transcodePct : 0;

    return (
      <div className="absolute inset-0 w-full h-full bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={poster}
          playsInline
          onTimeUpdate={(e) => {
            const t = (e.target as HTMLVideoElement);
            const d = totalDurationRef.current || t.duration;
            onTimeUpdate?.(t.currentTime, d > 0 ? d : 0);
          }}
        />

        {/* Progress overlay */}
        {showOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 z-20">
            <div className="w-10 h-10 border-[3px] border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-white/70 text-center px-6">{phaseLabel[phase] || ''}</p>
            {barPct > 0 && (
              <div className="w-56 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-300"
                  style={{
                    width: `${barPct}%`,
                    background: phase === 'downloading'
                      ? 'linear-gradient(to right,#34D399,#10b981)'
                      : 'linear-gradient(to right,#a78bfa,#8b5cf6)',
                  }}
                />
              </div>
            )}
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">
              {isMT() ? 'Multi-thread WASM' : 'Single-thread WASM'} · {Math.min(WORKER_POOL_SIZE, totalChunks || 1)} Workers
            </span>
          </div>
        )}

        {/* Background transcode indicator (after playback started) */}
        {hasStarted && phase === 'transcoding' && (
          <div className="absolute top-3 right-3 z-30 flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full pointer-events-none">
            <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-white/60 font-medium">
              Processing {chunksDone}/{totalChunks}
            </span>
          </div>
        )}

        {/* Error state */}
        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-white/70 text-sm">Gagal memproses video HEVC</p>
            <p className="text-white/40 text-xs mt-1">Browser tidak mendukung codec ini</p>
          </div>
        )}
      </div>
    );
  }
);

export default H265DashPlayer;
