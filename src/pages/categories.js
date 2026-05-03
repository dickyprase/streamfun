import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';

// Static categories with emojis (since the API filters endpoint returns deep links)
const staticCategories = [
  { slug: 'Korea', name: 'K-Drama', emoji: '🇰🇷', type: 'country' },
  { slug: 'China', name: 'C-Drama', emoji: '🇨🇳', type: 'country' },
  { slug: 'Japan', name: 'Japanese', emoji: '🇯🇵', type: 'country' },
  { slug: 'Thailand', name: 'Thai Drama', emoji: '🇹🇭', type: 'country' },
  { slug: 'Indonesia', name: 'Indonesia', emoji: '🇮🇩', type: 'country' },
  { slug: 'India', name: 'Bollywood', emoji: '🇮🇳', type: 'country' },
  { slug: 'United States', name: 'Hollywood', emoji: '🇺🇸', type: 'country' },
  { slug: 'Philippines', name: 'Filipino', emoji: '🇵🇭', type: 'country' },
  { slug: 'Action', name: 'Action', emoji: '💥', type: 'genre' },
  { slug: 'Horror', name: 'Horror', emoji: '👻', type: 'genre' },
  { slug: 'Romance', name: 'Romance', emoji: '💕', type: 'genre' },
  { slug: 'Comedy', name: 'Comedy', emoji: '😂', type: 'genre' },
  { slug: 'Drama', name: 'Drama', emoji: '🎭', type: 'genre' },
  { slug: 'Anime', name: 'Anime', emoji: '🗾', type: 'genre' },
  { slug: 'Animation', name: 'Animation', emoji: '🎨', type: 'genre' },
  { slug: 'Adventure', name: 'Adventure', emoji: '🧭', type: 'genre' },
  { slug: 'Fantasy', name: 'Fantasy', emoji: '🧙', type: 'genre' },
  { slug: 'Thriller', name: 'Thriller', emoji: '🔪', type: 'genre' },
  { slug: 'Sci-Fi', name: 'Sci-Fi', emoji: '🚀', type: 'genre' },
  { slug: 'Crime', name: 'Crime', emoji: '🕵️', type: 'genre' },
  { slug: 'Mystery', name: 'Mystery', emoji: '🔍', type: 'genre' },
  { slug: 'Family', name: 'Family', emoji: '👨‍👩‍👧‍👦', type: 'genre' },
];

export default function CategoriesPage() {
  const { siteSettings } = useAuth();

  const countries = staticCategories.filter(c => c.type === 'country');
  const genres = staticCategories.filter(c => c.type === 'genre');

  return (
    <>
      <Head>
        <title>Kategori - {siteSettings.site_name}</title>
        <meta name="description" content="Jelajahi semua kategori film dan series." />
      </Head>

      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">📂 Semua Kategori</h1>
          <p className="text-gray-400">Jelajahi konten berdasarkan negara atau genre.</p>
        </motion.div>

        {/* By Country */}
        <h2 className="text-xl font-bold text-white mb-4">🌏 Berdasarkan Negara</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-10">
          {countries.map((cat, index) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link href={`/category/${encodeURIComponent(cat.slug)}?type=country`}>
                <div className="card group p-5 hover:ring-2 hover:ring-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 cursor-pointer h-full">
                  <div className="text-3xl mb-3">{cat.emoji}</div>
                  <h3 className="text-white font-semibold text-sm group-hover:text-primary-400 transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* By Genre */}
        <h2 className="text-xl font-bold text-white mb-4">🎬 Berdasarkan Genre</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {genres.map((cat, index) => (
            <motion.div
              key={cat.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link href={`/category/${encodeURIComponent(cat.slug)}?type=genre`}>
                <div className="card group p-5 hover:ring-2 hover:ring-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300 cursor-pointer h-full">
                  <div className="text-3xl mb-3">{cat.emoji}</div>
                  <h3 className="text-white font-semibold text-sm group-hover:text-primary-400 transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
}
