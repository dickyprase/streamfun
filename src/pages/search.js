import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { motion } from 'framer-motion';
import ContentGrid from '@/components/Content/ContentGrid';
import { useAuth } from '@/context/AuthContext';

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const { siteSettings } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef(null);

  // Sync query from URL on mount
  useEffect(() => {
    if (q && typeof q === 'string') {
      setQuery(q);
      performSearch(q);
    }
  }, [q]);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch(`/api/proxy/search?q=${encodeURIComponent(searchQuery.trim())}&page=1`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
    setLoading(false);
  }, []);

  // Live search: debounce 500ms after typing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch(value.trim());
        // Update URL without full navigation
        router.replace(`/search?q=${encodeURIComponent(value.trim())}`, undefined, { shallow: true });
      }, 500);
    } else if (value.trim().length === 0) {
      setResults([]);
      setSearched(false);
      setTotal(0);
    }
  };

  // Immediate search on Enter/submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      router.replace(`/search?q=${encodeURIComponent(query.trim())}`, undefined, { shallow: true });
      performSearch(query.trim());
    }
  };

  const popularSearches = ['One Piece', 'K-Drama', 'Action', 'Romance', 'Anime', 'Horror', 'Comedy'];

  return (
    <>
      <Head>
        <title>{q ? `"${q}" - Pencarian` : 'Pencarian'} - {siteSettings.site_name}</title>
      </Head>

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-4">🔍 Pencarian</h1>

          <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="Cari film, series, anime, genre..."
                className="w-full bg-dark-300 text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm border border-dark-400 focus:border-primary-500 transition-colors"
                autoFocus
              />
              {/* Live search indicator */}
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Cari
            </motion.button>
          </form>

          {/* Typing hint */}
          {query.length > 0 && query.length < 2 && (
            <p className="text-gray-500 text-xs mt-2">Ketik minimal 2 karakter untuk pencarian otomatis...</p>
          )}
        </motion.div>

        {/* Popular Searches (when no query) */}
        {!searched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Pencarian Populer</h3>
            <div className="flex flex-wrap gap-2 mb-8">
              {popularSearches.map(term => (
                <button
                  key={term}
                  onClick={() => {
                    setQuery(term);
                    performSearch(term);
                    router.replace(`/search?q=${encodeURIComponent(term)}`, undefined, { shallow: true });
                  }}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-dark-300 text-gray-300 hover:bg-primary-500/20 hover:text-primary-400 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {searched && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {!loading && (
              <p className="text-gray-400 text-sm mb-4">
                {results.length > 0
                  ? `Ditemukan ${total || results.length} hasil untuk "${q || query}"`
                  : `Tidak ada hasil untuk "${q || query}"`}
              </p>
            )}
            <ContentGrid items={results} loading={loading} />
          </motion.div>
        )}
      </div>
    </>
  );
}
