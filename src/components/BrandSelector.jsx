import { ErrorMessage, Loader } from './Feedback'

export default function BrandSelector({
  idle,
  loading,
  error,
  manufacturers,
  brand,
  onSelect,
  onRetry,
}) {
  return (
    <section
      aria-label="Выбор производителя"
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <h2 className="mb-4 flex items-center gap-3 text-base font-semibold">
        <span className="step-number">2</span>Производитель
      </h2>
      {idle ? (
        <p className="text-sm leading-relaxed text-slate-400">Сначала введите артикул детали.</p>
      ) : loading ? (
        <Loader>Ищем производителей…</Loader>
      ) : error ? (
        <ErrorMessage error={error} onRetry={onRetry} />
      ) : manufacturers?.length ? (
        <div className="space-y-2">
          {manufacturers.map((manufacturer) => (
            <button
              key={manufacturer}
              aria-pressed={brand === manufacturer}
              onClick={() => onSelect(manufacturer)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${brand === manufacturer ? 'border-orange-600 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50'}`}
            >
              {manufacturer}
              <span
                aria-hidden="true"
                className={brand === manufacturer ? 'text-orange-600' : 'text-slate-300'}
              >
                {brand === manufacturer ? '✓' : '→'}
              </span>
            </button>
          ))}
        </div>
      ) : (
        manufacturers && (
          <div role="status">
            <p className="text-sm font-medium">Производители не найдены</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Проверьте артикул и попробуйте ещё раз.
            </p>
          </div>
        )
      )}
    </section>
  )
}
