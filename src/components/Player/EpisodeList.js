import { useState } from 'react';
import { motion } from 'framer-motion';

export default function EpisodeList({ episodes, currentEpisode, onEpisodeSelect }) {
  const [imageLoaded, setImageLoaded] = useState({});

  if (!episodes || episodes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Episodes</h3>
        <span className="text-sm text-gray-400">{episodes.length} Episode</span>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
        {episodes.map((ep, index) => (
          <motion.button
            key={ep.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onEpisodeSelect(ep)}
            className={`w-full flex gap-3 p-2 rounded-lg transition-all duration-200 text-left group ${
              currentEpisode === ep.number
                ? 'bg-primary-500/20 ring-1 ring-primary-500/50'
                : 'hover:bg-white/5'
            }`}
          >
            {/* Thumbnail */}
            <div className="relative w-28 h-16 flex-shrink-0 rounded-md overflow-hidden bg-dark-400">
              <img
                src={ep.thumbnail}
                alt={ep.title}
                className={`w-full h-full object-cover transition-opacity ${
                  imageLoaded[ep.id] ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(prev => ({ ...prev, [ep.id]: true }))}
                loading="lazy"
              />
              {!imageLoaded[ep.id] && <div className="absolute inset-0 skeleton" />}

              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </div>

              {/* Now playing indicator */}
              {currentEpisode === ep.number && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex items-end gap-0.5 h-4">
                    {[1, 2, 3].map(i => (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary-500 rounded-full"
                        animate={{ height: ['40%', '100%', '40%'] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${
                  currentEpisode === ep.number ? 'text-primary-400' : 'text-white'
                }`}>
                  Ep {ep.number}
                </span>
                {currentEpisode === ep.number && (
                  <span className="badge badge-primary text-[10px]">Playing</span>
                )}
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{ep.description}</p>
              <span className="text-[11px] text-gray-500 mt-1 block">{ep.duration}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
