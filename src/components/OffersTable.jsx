const rubles = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
})

export default function OffersTable({ offers, brand, number }) {
  return (
    <section
      aria-label="Результаты поиска"
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Предложения и аналоги</h2>
          <p className="mt-1 text-sm text-slate-500">
            {brand} <span className="mx-1 text-slate-300">/</span>{' '}
            <span className="font-mono">{number}</span>
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          Предложений: {offers.length}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Цены и остатки по каждому складу</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th scope="col" className="px-6 py-3.5 font-medium">
                Деталь / производитель
              </th>
              <th scope="col" className="hidden px-4 py-3.5 font-medium sm:table-cell">
                Склад
              </th>
              <th scope="col" className="px-3 py-3.5 text-right font-medium">
                Остаток
              </th>
              <th scope="col" className="px-4 py-3.5 text-right font-medium sm:px-6">
                Цена
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {offers.map((offer) => (
              <tr key={offer.id} className="transition-colors hover:bg-orange-50/40">
                <td className="px-4 py-5 sm:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{offer.brand}</span>
                    {offer.analogue && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                        АНАЛОГ
                      </span>
                    )}
                  </div>
                  <p className="mt-1 max-w-80 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {offer.name}
                  </p>
                  <p className="mt-1.5 break-all font-mono text-xs text-slate-400">
                    {offer.number}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 sm:hidden">Склад: {offer.warehouse}</p>
                </td>
                <td className="hidden px-4 py-5 text-xs text-slate-500 sm:table-cell">
                  {offer.warehouse}
                </td>
                <td className="whitespace-nowrap px-3 py-5 text-right text-xs">
                  <span className={offer.stock > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                    {offer.stock > 0 ? `${offer.stock} шт.` : 'Нет в наличии'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-5 text-right font-semibold tabular-nums sm:px-6">
                  {Number.isFinite(offer.price) ? rubles.format(offer.price) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-6 py-4 text-xs leading-relaxed text-slate-400">
        Каждая строка — отдельное предложение склада. Цена указана за единицу.
      </p>
    </section>
  )
}
