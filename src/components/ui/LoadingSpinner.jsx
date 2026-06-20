// src/components/ui/LoadingSpinner.jsx
// FIX: Added bg-surface-900 to fullScreen variant so it covers everything properly
//      and doesn't inherit a transparent background.
export default function LoadingSpinner({ fullScreen = false, size = 'md', label = '' }) {
  const sizes = { sm: 'w-5 h-5 border-[1.5px]', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-2' }

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizes[size]} border-surface-500 border-t-brand-500 rounded-full animate-spin`} />
      {label && <p className="text-slate-400 text-sm">{label}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-surface-900 flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }
  return spinner
}
