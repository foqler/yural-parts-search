import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useGetBrandsQuery, useGetConfigQuery } from './api/partsApi'
import { brandSelected, numberChanged } from './store/searchSlice'
import { ErrorMessage, Loader } from './components/Feedback'
import SearchForm from './components/SearchForm'
import BrandSelector from './components/BrandSelector'
import SearchResults from './components/SearchResults'
import { FishCursorTrail } from './components/aquarium/FishCursorTrail'

export default function App() {
  const config = useGetConfigQuery()

  if (!config.data) {
    return (
      <main className="mx-auto max-w-lg px-5 py-16">
        {config.isError ? (
          <ErrorMessage error={config.error} onRetry={config.refetch} />
        ) : (
          <Loader>Подключаем каталог…</Loader>
        )}
      </main>
    )
  }

  return <SearchPage demo={config.data.demo} />
}

function SearchPage({ demo }) {
  const dispatch = useDispatch()
  const { number, brand } = useSelector((state) => state.search)
  const [debouncedNumber, setDebouncedNumber] = useState('')
  const query = number.trim()
  const waiting = query !== debouncedNumber
  const brands = useGetBrandsQuery(debouncedNumber, {
    skip: !query || waiting,
    refetchOnMountOrArgChange: true,
  })
  const manufacturers = !waiting && query ? brands.currentData : undefined

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedNumber(query), 350)
    return () => clearTimeout(timer)
  }, [query])

  function searchNow(event) {
    event.preventDefault()
    if (!query) return
    dispatch(brandSelected(''))
    if (query === debouncedNumber && !brands.isUninitialized) brands.refetch()
    else setDebouncedNumber(query)
  }

  return (
    <div className="min-h-screen">
      <header className="relative z-2 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/" aria-label="ЮРАЛ — на главную" className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-xl font-black text-white"
            >
              Ю
            </span>
            <span className="text-xl font-extrabold tracking-tight">
              ЮРАЛ<span className="text-orange-600">.</span>
            </span>
            <span className="ml-4 hidden border-l border-slate-200 pl-5 text-sm text-slate-500 sm:block">
              Каталог запчастей
            </span>
          </a>
          {demo && (
            <span className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Демо-режим
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 pt-10 sm:px-8 sm:pt-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
          <div className="relative z-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700">
              Подбор по артикулу
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[42px] sm:leading-tight">
              Поиск автозапчастей
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
              Найдите нужную деталь, сравните аналоги и предложения складов.
            </p>
          </div>
          <FishCursorTrail />
        </div>
        <div
          aria-label="Этапы поиска"
          className="relative z-2 mb-4 flex items-center gap-3 text-xs text-slate-400"
        >
          <span className="font-medium text-slate-800">01 Артикул</span>
          <span aria-hidden="true">/</span>
          <span className={manufacturers?.length ? 'font-medium text-slate-800' : ''}>
            02 Бренд
          </span>
          <span aria-hidden="true">/</span>
          <span className={brand ? 'font-medium text-slate-800' : ''}>03 Предложения</span>
        </div>
        {demo && (
          <div className="relative z-2 mb-6 flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-4 py-3 text-xs leading-relaxed text-amber-900">
            <span aria-hidden="true" className="mt-0.5 font-mono font-bold">
              i
            </span>
            <p>Показаны тестовые данные. Цены и остатки приведены для демонстрации поиска.</p>
          </div>
        )}

        <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div data-fish-ignore className="relative z-2 space-y-5">
              <SearchForm
                number={number}
                onChange={(value) => dispatch(numberChanged(value))}
                onSubmit={searchNow}
                demo={demo}
              />

              <BrandSelector
                idle={!query}
                loading={waiting || brands.isFetching}
                error={brands.error}
                manufacturers={manufacturers}
                brand={brand}
                onSelect={(value) => dispatch(brandSelected(value))}
                onRetry={brands.refetch}
              />
            </div>
          </aside>

          <div className="relative z-2 min-w-0" data-fish-repel-zone>
            <SearchResults
              number={query}
              brand={brand}
              hasManufacturers={!!manufacturers?.length}
            />
          </div>
        </div>
        <footer className="relative z-2 mt-10 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400">
          <span>ЮРАЛ · Поиск автозапчастей</span>
          <span>Тестовое задание · React / Redux</span>
        </footer>
      </main>
    </div>
  )
}
