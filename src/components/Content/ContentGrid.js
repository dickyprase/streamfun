import ContentCard from './ContentCard';
import SkeletonCard from '../UI/SkeletonCard';

export default function ContentGrid({ items, loading = false, columns = 'default' }) {
  const gridClass = columns === 'compact'
    ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3'
    : 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6';

  if (loading) {
    return (
      <div className={gridClass}>
        <SkeletonCard count={12} />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-xl font-semibold text-white mb-2">Tidak ada konten</h3>
        <p className="text-gray-400">Konten untuk kategori ini belum tersedia.</p>
      </div>
    );
  }

  // Deduplicate items by id to prevent React key warnings
  const uniqueItems = [];
  const seen = new Set();
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      uniqueItems.push(item);
    }
  }

  return (
    <div className={gridClass}>
      {uniqueItems.map((item, index) => (
        <ContentCard key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}
