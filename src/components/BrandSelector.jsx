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
  let content = null

  if (idle) {
    content = (
      <p className="text-sm leading-relaxed text-slate-400">Сначала введите артикул детали.</p>
    )
  } else if (loading) {
    content = <Loader>Ищем производителей…</Loader>
  } else if (error) {
    content = <ErrorMessage error={error} onRetry={onRetry} />
  } else if (manufacturers?.length) {
    content = (
      <div className="space-y-2">
        {manufacturers.map((manufacturer) => {
          const selected = brand === manufacturer

          return (
            <button
              key={manufacturer}
              aria-pressed={selected}
              onClick={() => onSelect(manufacturer)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition ${selected ? 'border-orange-600 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50'}`}
            >
              {manufacturer}
              <span aria-hidden="true" className={selected ? 'text-orange-600' : 'text-slate-300'}>
                {selected ? '✓' : '→'}
              </span>
            </button>
          )
        })}
      </div>
    )
  } else if (manufacturers) {
    content = (
      <div role="status">
        <p className="text-sm font-medium">Производители не найдены</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Проверьте артикул и попробуйте ещё раз.
        </p>
      </div>
    )
  }

  return (
    <section
      aria-label="Выбор производителя"
      className="rounded-2xl border border-slate-200 bg-white p-6"
    >
      <h2 className="mb-4 flex items-center gap-3 text-base font-semibold">
        <span className="step-number">2</span>Производитель
      </h2>
      {content}
    </section>
  )
}
