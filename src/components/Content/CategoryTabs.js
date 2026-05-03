import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function CategoryTabs({ tabs = [], activeTab, onTabChange }) {
  const scrollRef = useRef(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeftFade(el.scrollLeft > 20);
    setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);
  };

  useEffect(() => {
    handleScroll();
  }, [tabs]);

  if (!tabs || tabs.length === 0) {
    // Skeleton tabs
    return (
      <div className="flex gap-2 pb-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-9 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Left fade */}
      {showLeftFade && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-dark-100 to-transparent z-10 pointer-events-none" />
      )}
      {/* Right fade */}
      {showRightFade && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-dark-100 to-transparent z-10 pointer-events-none" />
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto scrollbar-hide gap-2 pb-2 py-1"
        role="tablist"
        aria-label="Kategori konten"
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id, tab.name)}
            whileTap={{ scale: 0.95 }}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {tab.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
