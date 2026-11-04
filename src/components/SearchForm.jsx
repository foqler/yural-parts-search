export default function SearchForm({ number, onChange, onSubmit, demo }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="mb-5 flex items-center gap-3 text-base font-semibold">
        <span className="step-number">1</span>Номер детали
      </h2>
      <form onSubmit={onSubmit}>
        <label htmlFor="part-number" className="mb-2 block text-xs font-medium text-slate-600">
          Артикул детали
        </label>
        <div className="relative">
          <input
            id="part-number"
            value={number}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Например, 01089"
            autoComplete="off"
            spellCheck="false"
            maxLength={100}
            aria-describedby="search-hint"
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-3.5 pr-10 font-mono text-sm outline-none transition focus:border-orange-500 focus:ring-3 focus:ring-orange-100"
          />
          {number && (
            <button
              type="button"
              aria-label="Очистить артикул"
              onClick={() => onChange('')}
              className="absolute inset-y-0 right-0 w-10 text-xl text-slate-400 hover:text-slate-900"
            >
              ×
            </button>
          )}
        </div>
        <p id="search-hint" className="mt-2 text-xs leading-relaxed text-slate-400">
          Поиск начнётся автоматически после ввода.
        </p>
        <button
          type="submit"
          disabled={!number.trim()}
          className="mt-5 flex w-full items-center justify-center gap-3 rounded-lg bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          Найти деталь <span aria-hidden="true">→</span>
        </button>
      </form>
      {demo && (
        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-400">Попробуйте артикул</p>
          <div className="flex flex-wrap gap-2">
            {['01089', 'W 914/2', '7160500039S'].map((sample) => (
              <button
                key={sample}
                onClick={() => onChange(sample)}
                className="rounded-md bg-slate-100 px-2 py-1.5 font-mono text-[11px] text-slate-600 transition hover:bg-orange-100 hover:text-orange-800"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
