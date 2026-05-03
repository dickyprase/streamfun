import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ContentCard({ item, index = 0 }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: 'easeOut' }}
    >
      <Link href={`/detail/${item.slug || item.id}?id=${item.id}`}>
        <div className="card group cursor-pointer hover:ring-2 hover:ring-primary-500/50 hover:shadow-xl hover:shadow-primary-500/10 transition-all duration-300">
          {/* Poster */}
          <div className="relative aspect-[2/3] overflow-hidden bg-dark-400">
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 skeleton" />
            )}
            <img
              src={imageError ? '/placeholder.svg' : item.poster}
              alt={item.title}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />

            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Play button on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-12 h-12 rounded-full bg-primary-500/90 flex items-center justify-center backdrop-blur-sm"
              >
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </motion.div>
            </div>

            {/* Rating badge */}
            {item.rating && (
              <div className="absolute top-2 left-2 badge badge-yellow text-[10px]">
                <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {item.rating}
              </div>
            )}

            {/* Type badge */}
            <div className="absolute top-2 right-2">
              <span className={`badge text-[10px] ${item.type === 'series' ? 'bg-blue-500/30 text-blue-300' : 'bg-green-500/30 text-green-300'}`}>
                {item.type === 'series' ? 'Series' : 'Movie'}
              </span>
            </div>

            {/* Episode progress for series */}
            {item.type === 'series' && item.currentEp && (
              <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
                <div className="flex justify-between text-[10px] text-gray-300 mb-1">
                  <span>Ep {item.currentEp}/{item.episodes}</span>
                </div>
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${(item.currentEp / item.episodes) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 space-y-1">
            <h3 className="text-sm font-semibold text-white line-clamp-1 group-hover:text-primary-400 transition-colors">
              {item.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{item.year}</span>
              {item.genre && (
                <>
                  <span className="w-1 h-1 rounded-full bg-gray-600" />
                  <span className="line-clamp-1">{item.genre.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
