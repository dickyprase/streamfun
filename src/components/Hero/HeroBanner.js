import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeroBanner({ banners = [] }) {
  const [current, setCurrent] = useState(0);

  const heroItems = banners.slice(0, 8);

  useEffect(() => {
    if (heroItems.length === 0) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroItems.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [heroItems.length]);

  if (heroItems.length === 0) {
    // Skeleton while loading
    return (
      <div className="relative h-[85vh] min-h-[600px] -mt-16 bg-dark-300 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-100 via-dark-100/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 container pb-32">
          <div className="max-w-xl space-y-4">
            <div className="skeleton h-5 w-32 rounded-full" />
            <div className="skeleton h-12 w-80 rounded-lg" />
            <div className="skeleton h-5 w-56 rounded" />
            <div className="flex gap-3">
              <div className="skeleton h-12 w-36 rounded-lg" />
              <div className="skeleton h-12 w-36 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const item = heroItems[current];
  const subject = item?.subject;

  return (
    <div className="relative h-[85vh] min-h-[600px] -mt-16 overflow-hidden">
      {/* Background Image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0"
        >
          <img
            src={item.image}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-dark-100 via-dark-100/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-100/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 container pb-24 md:pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-2xl space-y-4"
          >
            {/* Badges */}
            {subject && (
              <div className="flex items-center gap-2 flex-wrap">
                {subject.rating && (
                  <span className="badge badge-yellow">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {subject.rating}
                  </span>
                )}
                {subject.year && <span className="badge bg-white/10 text-gray-300">{subject.year}</span>}
                {subject.type && (
                  <span className="badge bg-white/10 text-gray-300 capitalize">{subject.type}</span>
                )}
                {subject.genre?.slice(0, 2).map(g => (
                  <span key={g} className="badge bg-white/10 text-gray-300">{g}</span>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
              {item.title}
            </h1>

            {/* Description */}
            {subject?.description && (
              <p className="text-gray-300 text-sm md:text-base line-clamp-3 max-w-lg">
                {subject.description}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Link href={`/detail/${item.slug || item.id}?id=${item.id}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-lg shadow-primary-500/30"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Tonton Sekarang
                </motion.button>
              </Link>
              <Link href={`/detail/${item.slug || item.id}?id=${item.id}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition-colors backdrop-blur-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Detail
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots indicator */}
        <div className="flex items-center gap-2 mt-8">
          {heroItems.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`transition-all duration-300 rounded-full ${
                i === current
                  ? 'w-8 h-2 bg-primary-500'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
