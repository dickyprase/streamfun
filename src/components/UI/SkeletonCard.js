export default function SkeletonCard({ count = 12 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card animate-pulse">
          <div className="aspect-[2/3] bg-dark-400" />
          <div className="p-3 space-y-2">
            <div className="skeleton h-4 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
