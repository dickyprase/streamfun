/**
 * DASH MPD Manifest Parser
 * 
 * Parses MPD XML → extracts segment URLs for download + transcode.
 * Designed for the specific MPD format from Streamkeun API:
 * - Static type (VOD)
 * - SegmentTemplate with $RepresentationID$ and $Number%05d$
 * - BaseURL relative to manifest URL
 */

export interface DashSegment {
  url: string;
  duration: number; // seconds
  isInit: boolean;
}

export interface DashRepresentation {
  id: string;
  width: number;
  height: number;
  bandwidth: number;
  codec: string;
  mimeType: string;
  segments: DashSegment[];
  totalDuration: number; // seconds
}

export interface DashManifest {
  duration: number; // total duration in seconds
  representations: DashRepresentation[];
  audioRepresentation: DashRepresentation | null;
}

/**
 * Parse ISO 8601 duration (PT23M51.6S) to seconds
 */
function parseDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?/);
  if (!match) return 0;
  const hours = parseFloat(match[1] || '0');
  const minutes = parseFloat(match[2] || '0');
  const seconds = parseFloat(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Parse MPD manifest text into structured data
 */
export function parseMpd(mpdText: string, manifestUrl: string): DashManifest {
  const parser = new DOMParser();
  const doc = parser.parseFromString(mpdText, 'application/xml');

  // Total duration
  const mpdEl = doc.querySelector('MPD');
  const totalDuration = parseDuration(mpdEl?.getAttribute('mediaPresentationDuration') || '');

  // Base URL (relative to manifest URL)
  const baseUrlEl = doc.querySelector('BaseURL');
  let baseUrl = '';
  if (baseUrlEl?.textContent) {
    const rawBase = baseUrlEl.textContent.trim();
    if (rawBase.startsWith('http')) {
      baseUrl = rawBase;
    } else {
      // Relative to manifest URL origin
      const origin = new URL(manifestUrl).origin;
      baseUrl = origin + (rawBase.startsWith('/') ? rawBase : '/' + rawBase);
    }
  } else {
    // Use manifest URL directory as base
    baseUrl = manifestUrl.substring(0, manifestUrl.lastIndexOf('/') + 1);
  }

  // Ensure baseUrl ends with /
  if (!baseUrl.endsWith('/')) baseUrl += '/';

  const representations: DashRepresentation[] = [];
  let audioRepresentation: DashRepresentation | null = null;

  // Parse AdaptationSets
  const adaptationSets = doc.querySelectorAll('AdaptationSet');
  adaptationSets.forEach(as => {
    const contentType = as.getAttribute('contentType') || '';
    const isVideo = contentType === 'video';
    const isAudio = contentType === 'audio';

    const reps = as.querySelectorAll('Representation');
    reps.forEach(rep => {
      const id = rep.getAttribute('id') || '0';
      const width = parseInt(rep.getAttribute('width') || '0');
      const height = parseInt(rep.getAttribute('height') || '0');
      const bandwidth = parseInt(rep.getAttribute('bandwidth') || '0');
      const codec = rep.getAttribute('codecs') || as.getAttribute('codecs') || '';
      const mimeType = rep.getAttribute('mimeType') || '';

      // Get SegmentTemplate (can be on Representation or AdaptationSet level)
      const segTemplate = rep.querySelector('SegmentTemplate') || as.querySelector('SegmentTemplate');
      if (!segTemplate) return;

      const timescale = parseInt(segTemplate.getAttribute('timescale') || '1000000');
      const segDuration = parseInt(segTemplate.getAttribute('duration') || '5000000');
      const startNumber = parseInt(segTemplate.getAttribute('startNumber') || '1');
      const initTemplate = segTemplate.getAttribute('initialization') || '';
      const mediaTemplate = segTemplate.getAttribute('media') || '';

      const segDurationSec = segDuration / timescale;
      const numSegments = Math.ceil(totalDuration / segDurationSec);

      // Build segment list
      const segments: DashSegment[] = [];

      // Init segment
      if (initTemplate) {
        const initUrl = baseUrl + initTemplate
          .replace('$RepresentationID$', id)
          .replace('$Bandwidth$', String(bandwidth));
        segments.push({ url: initUrl, duration: 0, isInit: true });
      }

      // Media segments
      for (let i = 0; i < numSegments; i++) {
        const number = startNumber + i;
        const mediaUrl = baseUrl + mediaTemplate
          .replace('$RepresentationID$', id)
          .replace('$Number%05d$', String(number).padStart(5, '0'))
          .replace('$Number$', String(number))
          .replace('$Bandwidth$', String(bandwidth));
        segments.push({ url: mediaUrl, duration: segDurationSec, isInit: false });
      }

      const repData: DashRepresentation = {
        id,
        width,
        height,
        bandwidth,
        codec,
        mimeType,
        segments,
        totalDuration,
      };

      if (isVideo) {
        representations.push(repData);
      } else if (isAudio && !audioRepresentation) {
        audioRepresentation = repData;
      }
    });
  });

  // Sort video representations by height (highest first)
  representations.sort((a, b) => b.height - a.height);

  return { duration: totalDuration, representations, audioRepresentation };
}

/**
 * Check if codec is HEVC/H.265
 */
export function isHevcCodec(codec: string): boolean {
  const c = codec.toLowerCase();
  return c.includes('hev1') || c.includes('hvc1') || c.includes('h265') || c.includes('hevc');
}

/**
 * Check if browser natively supports HEVC
 */
export function browserSupportsHevc(): boolean {
  if (typeof MediaSource === 'undefined') return false;
  return MediaSource.isTypeSupported('video/mp4;codecs="hev1.1.6.L93.90"') ||
    MediaSource.isTypeSupported('video/mp4;codecs="hvc1.1.6.L93.90"');
}
