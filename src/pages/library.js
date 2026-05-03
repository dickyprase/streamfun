import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import useLocalStorage from '@/hooks/useLocalStorage';

export default function LibraryPage() {
  const [library, setLibrary] = useLocalStorage('streamfront-library', []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const removeFromLibrary = (id) => {
    setLibrary(library.filter(item => item.id !== id));
  };

  const clearLibrary = () => {
    if (window.confirm('Hapus semua item dari library?')) {
      setLibrary([]);
    }
  };

  if (!mounted) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-6">
          <div className="skeleton h-10 w-48 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card">
                <div className="aspect-[2/3] skeleton" />
                <div className="p-3 space-y-2">
                  <div className="skeleton h-4 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Library - StreamFront</title>
        <meta name="description" content="Koleksi film dan series yang Anda simpan." />
      </Head>

      <div className="container py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">📚 Library</h1>
            <p className="text-gray-400">
              {library.length > 0
                ? `${library.length} item tersimpan`
                : 'Belum ada item tersimpan'}
            </p>
          </div>
          {library.length > 0 && (
            <button
              onClick={clearLibrary}
              className="text-sm text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            >
              Hapus Semua
            </button>
          )}
        </motion.div>

        {/* Library Content */}
        {library.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">Library Kosong</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Tambahkan film atau series ke library Anda untuk menonton nanti.
              Klik tombol &quot;Tambah ke Library&quot; di halaman detail.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Jelajahi Konten
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            <AnimatePresence>
              {library.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative group"
                >
                  <Link href={`/detail/${item.slug || item.id}?id=${item.id}`}>
                    <div className="card cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all duration-300">
                      <div className="relative aspect-[2/3] overflow-hidden bg-dark-400">
                        <img
                          src={item.poster}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary-400 transition-colors">
                          {item.title}
                        </h3>
                        <span className="text-xs text-gray-400 capitalize">{item.type}</span>
                      </div>
                    </div>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={(e) => { e.preventDefault(); removeFromLibrary(item.id); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:scale-110"
                    title="Hapus dari library"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </>
  );
}
