import { useGetOffersQuery } from '../api/partsApi'
import EmptyState from './EmptyState'
import { ErrorMessage, Loader } from './Feedback'
import OffersTable from './OffersTable'

export default function SearchResults({ number, brand, hasManufacturers }) {
  const offers = useGetOffersQuery(
    { number, brand },
    {
      skip: !brand,
      refetchOnMountOrArgChange: true,
    },
  )

  if (!brand) {
    return (
      <EmptyState
        title={hasManufacturers ? 'Выберите производителя' : 'Начните с артикула'}
        text={
          hasManufacturers
            ? 'Один номер может встречаться у разных брендов. Выберите нужный бренд — покажем предложения и аналоги.'
            : 'Здесь появятся найденные детали, цены и доступное количество на каждом складе.'
        }
      />
    )
  }

  if (offers.isFetching) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-20">
        <Loader>Загружаем предложения…</Loader>
      </div>
    )
  }

  if (offers.isError) return <ErrorMessage error={offers.error} onRetry={offers.refetch} />

  if (!offers.currentData?.length) {
    return (
      <EmptyState
        title="Предложений пока нет"
        text="Для выбранного производителя ничего не найдено. Попробуйте другой бренд или артикул."
      />
    )
  }

  return <OffersTable offers={offers.currentData} brand={brand} number={number} />
}
