import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import ContentGrid from '@/components/Content/ContentGrid';
import { useAuth } from '@/context/AuthContext';

export default function MoviesPage() {
  const { siteSettings } = useAuth();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Hottest');

  const sortOptions = ['Hottest', 'Rating', 'Newest'];

  useEffect(() => {
    fetchMovies();
  }, [filter]);

  const fetchMovies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/home?tabId=2`);
      if (res.ok) {
        const data = await res.json();
        const allItems = (data.sections || [])
          .filter(s => s.items.length > 0)
          .flatMap(s => s.items);

        const unique = [];
        const seen = new Set();
        for (const item of allItems) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            unique.push(item);
          }
        }
        setContent(unique);
      }
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Movies - {siteSettings.site_name}</title>
        <meta name="description" content="Koleksi film terbaru dan terlengkap." />
      </Head>

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">🎬 Movies</h1>
          <p className="text-gray-400">Film layar lebar terbaru dari berbagai genre.</p>
        </motion.div>

        <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-6 pb-2">
          {sortOptions.map(sort => (
            <button
              key={sort}
              onClick={() => setFilter(sort)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                filter === sort ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {sort}
            </button>
          ))}
        </div>

        <ContentGrid items={content} loading={loading} />
      </div>
    </>
  );
}
