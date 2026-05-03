import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import VideoPlayer from '@/components/Player/VideoPlayer';
import EpisodeList from '@/components/Player/EpisodeList';
import ContentGrid from '@/components/Content/ContentGrid';
import { useAuth } from '@/context/AuthContext';
import useLocalStorage from '@/hooks/useLocalStorage';

export default function DetailPage() {
  const router = useRouter();
  const { slug } = router.query;
  const { isAuthenticated, siteSettings } = useAuth();
  const [item, setItem] = useState(null);
  const [playData, setPlayData] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(0);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [currentQuality, setCurrentQuality] = useState(null);
  const [related, setRelated] = useState([]);
  const [library, setLibrary] = useLocalStorage('streamfront-library', []);
  const [loading, setLoading] = useState(true);
  const [playLoading, setPlayLoading] = useState(false);
  const [contentId, setContentId] = useState(null);

  // Resume playback state
  const [resumeTime, setResumeTime] = useState(0);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [initialSeekDone, setInitialSeekDone] = useState(false);

  // Extract content ID from slug
  useEffect(() => {
    if (!slug) return;
    const match = slug.match(/(\d{6,})$/);
    if (match) {
      setContentId(match[1]);
    } else {
      resolveIdFromSearch(slug);
    }
  }, [slug]);

  const resolveIdFromSearch = async (slugStr) => {
    const titlePart = slugStr.replace(/-[^-]+$/, '').replace(/-/g, ' ');
    try {
      const res = await fetch(`/api/proxy/search?q=${encodeURIComponent(titlePart)}&page=1`);
      if (res.ok) {
        const data = await res.json();
        const match = data.items?.find(i => i.slug === slugStr);
        if (match) { setContentId(match.id); return; }
        if (data.items?.[0]) { setContentId(data.items[0].id); return; }
      }
    } catch {}
    setLoading(false);
  };

  // Fetch detail info
  useEffect(() => {
    if (!contentId) return;
    setLoading(true);
    setPlayData(null);
    setInitialSeekDone(false);

    (async () => {
      try {
        const res = await fetch(`/api/proxy/info?id=${contentId}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data;
          setItem(data);

          // Determine initial season (0 for movies, first season for series)
          const seasons = data?.seasons || [];
          const isSeries = data?.type === 'series' || data?.type === 'anime' || (data?.episodes > 1);
          if (isSeries && seasons.length > 0) {
            setCurrentSeason(seasons[0].season);
            setCurrentEpisode(1);
          } else {
            setCurrentSeason(0);
            setCurrentEpisode(0);
          }

          // Track watch history
          if (isAuthenticated) {
            fetch('/api/user/history', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content_id: contentId,
                content_slug: slug,
                content_title: data?.title,
                content_poster: data?.poster,
              }),
            }).catch(() => {});

            // Fetch resume progress
            try {
              const progRes = await fetch(`/api/user/progress/${contentId}`);
              if (progRes.ok) {
                const progData = await progRes.json();
                if (progData.progress_seconds > 30 && progData.duration_seconds > 0) {
                  // Only show resume if not near the end (>95%)
                  const pct = progData.progress_seconds / progData.duration_seconds;
                  if (pct < 0.95) {
                    setResumeTime(progData.progress_seconds);
                    setShowResumeBanner(true);
                    // If series, also restore season/episode
                    if (progData.season > 0) setCurrentSeason(progData.season);
                    if (progData.episode > 0) setCurrentEpisode(progData.episode);
                  }
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Failed to fetch info:', err);
      }
      setLoading(false);
    })();

    // Fetch recommendations
    (async () => {
      try {
        const res = await fetch(`/api/proxy/recommendations?type=similar&id=${contentId}`);
        if (res.ok) {
          const json = await res.json();
          const items = json.items || [];
          const unique = [];
          const seen = new Set();
          for (const item of items) {
            if (!seen.has(item.id)) { seen.add(item.id); unique.push(item); }
          }
          setRelated(unique);
        }
      } catch {}
    })();
  }, [contentId, isAuthenticated]);

  // Fetch play data
  const fetchPlay = useCallback(async (season, episode) => {
    if (!contentId) return;
    setPlayLoading(true);
    try {
      const res = await fetch(`/api/proxy/play?id=${contentId}&season=${season}&episode=${episode}`);
      if (res.ok) {
        const json = await res.json();
        setPlayData(json.data);
        if (json.data?.qualities?.length > 0) {
          setCurrentQuality(json.data.qualities[json.data.qualities.length - 1]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch play:', err);
    }
    setPlayLoading(false);
  }, [contentId]);

  // Build stream proxy URL
  const getStreamUrl = useCallback((resolution) => {
    if (!contentId) return '';
    const params = new URLSearchParams({
      id: contentId,
      season: String(currentSeason),
      episode: String(currentEpisode),
    });
    if (resolution) params.set('resolution', String(resolution));
    return `/api/proxy/stream?${params.toString()}`;
  }, [contentId, currentSeason, currentEpisode]);

  // Auto-fetch play data ONLY on initial load (not on episode switch - that's handled by handlers)
  const initialFetchDone = useRef(false);
  useEffect(() => {
    if (item && contentId && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchPlay(currentSeason, currentEpisode);
    }
  }, [item, contentId]);

  // Save watch progress periodically (every 10s)
  const handleTimeUpdate = useCallback((currentTime, duration) => {
    if (!isAuthenticated || !contentId || !duration) return;
    // Debounce: only save every 10 seconds
    if (Math.floor(currentTime) % 10 !== 0) return;
    fetch('/api/user/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_id: contentId,
        content_slug: slug,
        content_title: item?.title,
        content_poster: item?.poster,
        progress_seconds: Math.floor(currentTime),
        duration_seconds: Math.floor(duration),
        season: currentSeason,
        episode: currentEpisode,
      }),
    }).catch(() => {});
  }, [isAuthenticated, contentId, slug, item, currentSeason, currentEpisode]);

  // Handle resume
  const handleResume = () => {
    setShowResumeBanner(false);
    setInitialSeekDone(true);
  };

  const handleDismissResume = () => {
    setShowResumeBanner(false);
    setResumeTime(0);
  };

  const isInLibrary = library.some(l => l.id === contentId);

  const toggleLibrary = () => {
    if (isInLibrary) {
      setLibrary(library.filter(l => l.id !== contentId));
    } else if (item) {
      setLibrary([...library, { id: contentId, slug: item.slug || slug, title: item.title, poster: item.poster, type: item.type, addedAt: Date.now() }]);
    }
  };

  const handleEpisodeSelect = (ep) => {
    setCurrentEpisode(ep.number);
    setResumeTime(0);
    setShowResumeBanner(false);
    // Don't null playData - let the new fetch overwrite it
    // The stream URL will change because currentEpisode changed (via getStreamUrl dep)
    fetchPlay(currentSeason, ep.number);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSeasonChange = (season) => {
    setCurrentSeason(season);
    setCurrentEpisode(1);
    setResumeTime(0);
    setShowResumeBanner(false);
    fetchPlay(season, 1);
  };

  const handleQualityChange = (quality) => {
    setCurrentQuality(quality);
  };

  if (loading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="aspect-video bg-dark-300 rounded-xl" />
          <div className="space-y-3">
            <div className="skeleton h-8 w-64 rounded" />
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-4 w-3/4 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container py-20 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-bold text-white mb-2">Konten tidak ditemukan</h2>
        <p className="text-gray-400 mb-6">Konten yang Anda cari tidak tersedia.</p>
        <Link href="/" className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors">
          Kembali ke Home
        </Link>
      </div>
    );
  }

  const currentSeasonData = item.seasons?.find(s => s.season === currentSeason);
  const totalEps = currentSeasonData?.maxEpisode || item.episodes || 1;
  const episodes = Array.from({ length: totalEps }, (_, i) => ({
    id: `${contentId}-s${currentSeason}-e${i + 1}`,
    number: i + 1,
    title: `Episode ${i + 1}`,
    duration: item.duration || '',
    thumbnail: item.backdrop || item.poster,
    description: `${item.title} - Season ${currentSeason}, Episode ${i + 1}`,
  }));

  const isSeries = item.type === 'series' || item.type === 'anime' || item.episodes > 1;

  const formatResumeTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>{item.title} - {siteSettings.site_name}</title>
        <meta name="description" content={item.description} />
      </Head>

      <div className="container py-6">
        {/* Resume Banner */}
        {showResumeBanner && resumeTime > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-purple-600/20 border border-purple-500/30 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Lanjutkan menonton</p>
                <p className="text-purple-300 text-xs">Terakhir di {formatResumeTime(resumeTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDismissResume}
                className="text-gray-400 hover:text-white text-xs px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                Dari Awal
              </button>
              <button
                onClick={handleResume}
                className="bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
              >
                Lanjutkan
              </button>
            </div>
          </motion.div>
        )}

        {/* Video Player */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <VideoPlayer
            src={getStreamUrl(currentQuality?.resolution)}
            poster={item.backdrop || item.poster}
            title={isSeries ? `${item.title} - S${currentSeason}E${currentEpisode}` : item.title}
            loading={playLoading}
            qualities={playData?.qualities || []}
            currentQuality={currentQuality}
            onQualityChange={handleQualityChange}
            subtitles={playData?.subtitles || []}
            initialSeekTime={initialSeekDone ? resumeTime : 0}
            onTimeUpdate={handleTimeUpdate}
          />
        </motion.div>

        {/* Content Info + Episodes */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div
            className={isSeries ? 'lg:col-span-2' : 'lg:col-span-3'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">
                {item.title}
                {isSeries && (
                  <span className="text-primary-400 text-lg ml-2">S{currentSeason} Ep {currentEpisode}</span>
                )}
              </h1>

              <div className="flex items-center gap-3 flex-wrap mb-4">
                {item.rating && (
                  <div className="flex items-center gap-1 badge badge-yellow">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {item.rating}
                  </div>
                )}
                {item.year && <span className="text-gray-400 text-sm">{item.year}</span>}
                {item.duration && <span className="text-gray-400 text-sm">{item.duration}</span>}
                {item.country && <span className="text-gray-400 text-sm">{item.country}</span>}
                {item.episodes > 1 && <span className="text-gray-400 text-sm">{item.episodes} Episode</span>}
                {item.contentRating && <span className="badge bg-white/10 text-gray-300 text-xs">{item.contentRating}</span>}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {item.genre?.map(g => (
                  <Link key={g} href={`/category/${encodeURIComponent(g)}?type=genre`}>
                    <span className="badge bg-white/10 text-gray-300 hover:bg-primary-500/20 hover:text-primary-400 transition-colors cursor-pointer">{g}</span>
                  </Link>
                ))}
              </div>

              {item.dubs && item.dubs.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs text-gray-500 self-center">Audio:</span>
                  {item.dubs.map(d => (
                    <Link key={d.id} href={`/detail/${slug}?id=${d.id}`}>
                      <span className={`badge text-xs transition-colors cursor-pointer ${
                        d.id === contentId ? 'bg-primary-500/30 text-primary-400 ring-1 ring-primary-500/50' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}>{d.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {item.seasons && item.seasons.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-xs text-gray-500 self-center">Season:</span>
                  {item.seasons.map(s => (
                    <button key={s.season} onClick={() => handleSeasonChange(s.season)}
                      className={`badge text-xs transition-colors ${
                        currentSeason === s.season ? 'bg-primary-500/30 text-primary-400 ring-1 ring-primary-500/50' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}>Season {s.season}</button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <motion.button whileTap={{ scale: 0.95 }} onClick={toggleLibrary}
                  className={`flex items-center gap-2 py-2.5 px-5 rounded-lg font-medium text-sm transition-all ${
                    isInLibrary ? 'bg-primary-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}>
                  {isInLibrary ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  )}
                  {isInLibrary ? 'Di Library' : 'Tambah ke Library'}
                </motion.button>
              </div>

              {item.description && <p className="text-gray-300 text-sm leading-relaxed mb-4">{item.description}</p>}

              {item.cast && item.cast.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Cast</h4>
                  <div className="flex flex-wrap gap-2">
                    {item.cast.slice(0, 10).map(actor => (
                      <div key={actor.id} className="flex items-center gap-2 bg-dark-300 px-3 py-1.5 rounded-full">
                        {actor.avatar && <img src={actor.avatar} alt={actor.name} className="w-5 h-5 rounded-full object-cover" />}
                        <span className="text-sm text-gray-300">{actor.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {isSeries && episodes.length > 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="lg:col-span-1">
              <EpisodeList episodes={episodes} currentEpisode={currentEpisode} onEpisodeSelect={handleEpisodeSelect} />
            </motion.div>
          )}
        </div>

        {related.length > 0 && (
          <motion.div className="mt-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <h3 className="text-xl font-bold text-white mb-4">Rekomendasi Serupa</h3>
            <ContentGrid items={related} />
          </motion.div>
        )}
      </div>
    </>
  );
}
