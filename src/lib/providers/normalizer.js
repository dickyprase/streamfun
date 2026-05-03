import { SUBJECT_TYPE } from '../constants';

/**
 * Normalize API subject/content item to internal format.
 * This is the single source of truth for data transformation.
 */
export function normalizeContentItem(item) {
  if (!item || !item.subjectId) return null;

  const subjectType = item.subjectType || 0;
  let type = 'movie';
  if (subjectType === SUBJECT_TYPE.SERIES) type = 'series';
  else if (subjectType === SUBJECT_TYPE.ANIME) type = 'anime';
  else if (subjectType === SUBJECT_TYPE.SHORT_TV) type = 'shorttv';

  const totalEpisode = item.resourceDetectors?.[0]?.totalEpisode
    || item.totalEpisode
    || 0;

  // Generate slug: judul-film-{fullId}
  // ID di-embed di slug agar detail page bisa extract tanpa query param
  const titleSlug = (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slug = titleSlug ? `${titleSlug}-${item.subjectId}` : String(item.subjectId);

  return {
    id: item.subjectId,
    slug,
    title: item.title || '',
    type,
    poster: item.cover?.url || '',
    backdrop: item.stills?.url || item.trailer?.cover?.url || item.cover?.url || '',
    rating: item.imdbRatingValue || item.imdbRate || '',
    year: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
    releaseDate: item.releaseDate || '',
    genre: item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [],
    country: item.countryName || '',
    duration: item.duration || formatDuration(item.durationSeconds || item.seconds),
    episodes: totalEpisode,
    viewers: item.viewers || 0,
    description: item.description || '',
    hasResource: item.hasResource !== false,
    corner: item.corner || '',
    contentRating: item.contentRating || '',
  };
}

/**
 * Normalize detail/info response
 */
export function normalizeDetailItem(item) {
  if (!item) return null;

  const base = normalizeContentItem(item);

  return {
    ...base,
    cast: (item.staffList || []).map(staff => ({
      id: staff.staffId,
      name: staff.name,
      character: staff.character || '',
      avatar: staff.avatarUrl || '',
      type: staff.staffType, // 1=actor, 2=director
    })),
    seasons: (item.seasons || []).map(s => ({
      season: s.se,
      maxEpisode: s.maxEp,
      resolutions: s.resolutions || [],
    })),
    dubs: (() => {
      const dubs = (item.dubs || []).map(d => ({
        id: d.subjectId,
        name: d.lanName,
        code: d.lanCode,
        isOriginal: d.original,
        type: d.type, // 0=dub, 1=sub
      }));
      // Deduplicate by id+code combination (same subjectId can appear for different languages)
      const seen = new Set();
      return dubs.filter(d => {
        const key = `${d.id}-${d.code}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    })(),
    trailer: item.trailer ? {
      url: item.trailer.VideoAddress?.url || '',
      cover: item.trailer.cover?.url || '',
      duration: item.trailer.VideoAddress?.duration || 0,
    } : null,
  };
}

/**
 * Normalize play/video response
 */
export function normalizePlayData(data) {
  if (!data) return null;

  const downloads = data.downloads || [];
  const processedSources = data.processedSources || [];
  const collectionResolutions = data.collectionResolutions || [];

  // Strategy 1: Multiple downloads with different resolutions (movies)
  // Group downloads by resolution for current episode
  const currentEpDownloads = downloads.filter(d => d.url);

  // Check if we have multiple resolutions in downloads directly
  const resolutionsInDownloads = [...new Set(currentEpDownloads.map(d => d.resolution))];

  let qualities = [];

  if (resolutionsInDownloads.length > 1) {
    // Movie case: multiple resolutions directly in downloads
    qualities = currentEpDownloads.map(d => ({
      resolution: d.resolution || 0,
      url: d.url,
      size: parseInt(d.size) || 0,
      duration: d.duration || 0,
      codec: d.codecName || '',
      label: `${d.resolution}p`,
    }));
  } else {
    // Series case: single resolution in downloads, check processedSources for higher quality
    // Add the default download
    if (currentEpDownloads.length > 0) {
      const dl = currentEpDownloads[0];
      qualities.push({
        resolution: dl.resolution || 360,
        url: dl.url,
        size: parseInt(dl.size) || 0,
        duration: dl.duration || 0,
        codec: dl.codecName || '',
        label: `${dl.resolution || 360}p`,
      });
    }

    // Add processedSources (DASH streams with higher quality)
    for (const ps of processedSources) {
      if (!ps.streamUrl && !ps.url) continue;
      const streamUrl = ps.streamUrl || ps.url;
      const maxRes = ps.quality || parseInt((ps.resolutions || '').split(',')[0]) || 1080;

      // Parse available resolutions from processedSources
      const resStr = ps.resolutions || '';
      const availableRes = resStr.split(',').map(r => parseInt(r)).filter(r => r > 0).sort((a, b) => a - b);

      if (availableRes.length > 0) {
        // Add each resolution from processedSources
        // The streamUrl serves the highest quality; for lower ones we still use it
        // (the server handles adaptive streaming)
        for (const res of availableRes) {
          if (!qualities.find(q => q.resolution === res)) {
            qualities.push({
              resolution: res,
              url: streamUrl, // Same URL serves adaptive quality
              size: parseInt(ps.size) || 0,
              duration: ps.duration || 0,
              codec: ps.codecName || '',
              label: `${res}p`,
              isAdaptive: true,
            });
          }
        }
      } else if (maxRes > 0) {
        // Fallback: just add the max resolution
        if (!qualities.find(q => q.resolution === maxRes)) {
          qualities.push({
            resolution: maxRes,
            url: streamUrl,
            size: parseInt(ps.size) || 0,
            duration: ps.duration || 0,
            codec: ps.codecName || '',
            label: `${maxRes}p`,
            isAdaptive: true,
          });
        }
      }
    }
  }

  // Sort by resolution (low to high)
  qualities.sort((a, b) => a.resolution - b.resolution);

  // Remove duplicates (keep highest quality URL for same resolution)
  const uniqueQualities = [];
  const seenRes = new Set();
  for (let i = qualities.length - 1; i >= 0; i--) {
    if (!seenRes.has(qualities[i].resolution)) {
      seenRes.add(qualities[i].resolution);
      uniqueQualities.unshift(qualities[i]);
    }
  }

  // If we still only have one quality but collectionResolutions shows more,
  // indicate available resolutions (even without direct URLs yet)
  const availableResolutions = collectionResolutions.map(cr => cr.resolution).sort((a, b) => a - b);

  // Default to highest quality available
  const defaultQuality = uniqueQualities[uniqueQualities.length - 1] || null;

  return {
    videoUrl: defaultQuality?.url || '',
    qualities: uniqueQualities,
    availableResolutions,
    defaultResolution: defaultQuality?.resolution || 0,
    subtitles: (data.captions || []).map(c => ({
      language: c.language || c.lanName || '',
      url: c.url || '',
      code: c.languageCode || c.lan || '',
    })),
    title: data.subjectTitle || data.playTitle || '',
    poster: data.cover?.url || '',
    duration: data.durationSeconds || 0,
    totalEpisode: data.totalEpisode || 0,
    episodeTitle: downloads[0]?.title || '',
  };
}

/**
 * Normalize home section
 */
export function normalizeHomeSection(section) {
  if (!section) return null;

  const result = {
    type: section.type,
    title: section.title || '',
    position: section.position || 0,
    items: [],
    banners: [],
  };

  // Handle different section types
  if (section.type === 'BANNER' && section.banner?.banners) {
    result.banners = section.banner.banners
      .filter(b => b.hasResource !== false && b.subjectId)
      .map(b => {
        const normalized = b.subject ? normalizeContentItem(b.subject) : null;
        // Extract slug from deepLink or subject detailUrl
        let slug = normalized?.slug || '';
        if (!slug && b.subject?.detailUrl) {
          const m = b.subject.detailUrl.match(/\/detail\/(.+)$/);
          if (m) slug = m[1];
        }
        return {
          id: b.subjectId,
          slug,
          title: b.content || b.subject?.title || '',
          image: b.image?.url || '',
          subject: normalized,
        };
      })
      .filter(b => b.image); // must have an image
  } else if (section.subjects) {
    result.items = section.subjects
      .map(normalizeContentItem)
      .filter(Boolean);
  } else if (section.type === 'CUSTOM' && section.customData?.items) {
    result.items = section.customData.items
      .filter(i => i.subjectId && i.subject)
      .map(i => normalizeContentItem(i.subject))
      .filter(Boolean);
  }

  return result;
}

/**
 * Normalize shorts item
 */
export function normalizeShortsItem(item) {
  if (!item) return null;

  return {
    id: item.subjectId,
    title: item.title || '',
    type: 'shorttv',
    poster: item.cover?.url || '',
    backdrop: item.firstEp?.video?.cover?.url || item.cover?.url || '',
    rating: '',
    year: item.releaseDate ? item.releaseDate.substring(0, 4) : '',
    releaseDate: item.releaseDate || '',
    genre: item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : (item.tags || []),
    country: item.countryName || '',
    duration: '',
    episodes: item.totalEpisode || 0,
    viewers: 0,
    description: item.description || '',
    hasResource: true,
    firstEpisodeUrl: item.firstEp?.video?.videoAddress?.url || '',
  };
}

/**
 * Normalize search results
 */
export function normalizeSearchResults(data) {
  return {
    items: (data.items || []).map(normalizeContentItem).filter(Boolean),
    hasMore: data.pager?.hasMore || false,
    nextPage: data.pager?.nextPage || null,
    total: data.pager?.totalCount || 0,
    counts: data.counts || [],
  };
}

/**
 * Normalize trending results
 */
export function normalizeTrendingResults(data) {
  const allItems = (data.items || [])
    .filter(item => item && (item.subject || item.subjectId))
    .map(item => {
      try {
        return normalizeContentItem(item.subject || item);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  // Deduplicate by id
  const seen = new Set();
  const items = allItems.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return {
    items,
    hasMore: data.pager?.hasMore || false,
    nextPage: data.pager?.nextPage || null,
  };
}

// Helpers
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '';
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
