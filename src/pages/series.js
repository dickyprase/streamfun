import { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import ContentGrid from '@/components/Content/ContentGrid';
import { useAuth } from '@/context/AuthContext';

export default function SeriesPage() {
  const { siteSettings } = useAuth();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Hottest');

  const sortOptions = ['Hottest', 'Rating', 'Newest'];

  useEffect(() => {
    fetchSeries();
  }, [filter]);

  const fetchSeries = async () => {
    setLoading(true);
    try {
      // Use home endpoint with TV tab
      const res = await fetch(`/api/proxy/home?tabId=5`);
      if (res.ok) {
        const data = await res.json();
        const allItems = (data.sections || [])
          .filter(s => s.items.length > 0)
          .flatMap(s => s.items);

        // Deduplicate
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
      console.error('Failed to fetch series:', err);
    }
    setLoading(false);
  };

  return (
    <>
      <Head>
        <title>Series - {siteSettings.site_name}</title>
        <meta name="description" content="Koleksi series terlengkap dari berbagai genre." />
      </Head>

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">📺 Series</h1>
          <p className="text-gray-400">Koleksi series terlengkap dari berbagai genre dan negara.</p>
        </motion.div>

        {/* Sort */}
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
