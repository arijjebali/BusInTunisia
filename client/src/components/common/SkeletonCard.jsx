export default function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="skeleton h-5 w-32 mb-2" />
          <div className="skeleton h-4 w-20" />
        </div>
        <div className="skeleton h-8 w-20 rounded-full" />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="skeleton h-10 w-16" />
        <div className="skeleton h-4 w-24 flex-1" />
        <div className="skeleton h-10 w-16" />
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="skeleton h-6 w-20" />
        <div className="skeleton h-10 w-28 rounded-xl" />
      </div>
    </div>
  )
}
