export default function SkeletonHero() {
  return (
    <div className="relative h-screen min-h-screen -mt-16 bg-dark-300 animate-pulse">
      <div className="absolute inset-0 bg-gradient-to-t from-dark-100 via-dark-100/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 container pb-32 md:pb-40">
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
