export default function LoadingSpinner({ size = 'md', fullPage = false }) {
  const s = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }[size]

  const spinner = (
    <div className={`${s} border-4 border-burgundy-200 border-t-burgundy-800 rounded-full animate-spin`} />
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-10">
      {spinner}
    </div>
  )
}
