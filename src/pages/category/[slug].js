import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import ContentGrid from '@/components/Content/ContentGrid';
import { useAuth } from '@/context/AuthContext';

export default function CategoryPage() {
  const router = useRouter();
  const { slug, type = 'genre' } = router.query;
  const { siteSettings } = useAuth();
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setPage(1);
    setContent([]);
    fetchContent(1);
  }, [slug, type]);

  const fetchContent = async (p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, sort: 'Hottest' });
      if (type === 'country') {
        params.set('country', slug);
      } else {
        params.set('genre', slug);
      }

      const res = await fetch(`/api/proxy/browse?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (p === 1) {
          setContent(data.items || []);
        } else {
          setContent(prev => {
            const existing = new Set(prev.map(i => i.id));
            const newItems = (data.items || []).filter(i => !existing.has(i.id));
            return [...prev, ...newItems];
          });
        }
        setHasMore(data.hasMore || false);
      }
    } catch (err) {
      console.error('Failed to fetch category:', err);
    }
    setLoading(false);
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContent(nextPage);
  };

  const displayName = slug ? decodeURIComponent(slug) : '';

  return (
    <>
      <Head>
        <title>{displayName} - {siteSettings.site_name}</title>
      </Head>

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
          <p className="text-gray-400 capitalize">
            {type === 'country' ? `Konten dari ${displayName}` : `Genre: ${displayName}`}
          </p>
        </motion.div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-white transition-colors">Kategori</Link>
          <span>/</span>
          <span className="text-white">{displayName}</span>
        </div>

        <ContentGrid items={content} loading={loading && page === 1} />

        {/* Load More */}
        {hasMore && !loading && (
          <div className="text-center mt-8">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={loadMore}
              className="bg-dark-300 hover:bg-dark-400 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              Muat Lebih Banyak
            </motion.button>
          </div>
        )}

        {loading && page > 1 && (
          <div className="text-center mt-8">
            <div className="inline-block w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </>
  );
}
