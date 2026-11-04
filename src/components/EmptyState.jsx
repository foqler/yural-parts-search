export default function EmptyState({ title, text }) {
  return (
    <section className="flex min-h-100 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 px-8 py-16 text-center sm:min-h-113">
      <div
        aria-hidden="true"
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-xs"
      >
        <svg width="38" height="38" viewBox="0 0 40 40" fill="none" className="text-slate-400">
          <path
            d="m20 4 14 8v16l-14 8-14-8V12l14-8Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="m6 12 14 8 14-8M20 20v16M13 8l14 8v8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="30" cy="29" r="7" fill="#fff7ed" stroke="#ea580c" strokeWidth="1.5" />
          <path d="m35 34 4 4" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">{text}</p>
      <div aria-hidden="true" className="mt-8 flex items-center gap-2">
        <span className="h-1 w-6 rounded-full bg-orange-600" />
        <span className="h-1 w-6 rounded-full bg-slate-200" />
        <span className="h-1 w-6 rounded-full bg-slate-200" />
      </div>
    </section>
  )
}
