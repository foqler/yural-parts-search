export function Loader({ children }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-orange-600 motion-reduce:animate-none" />
      {children}
    </div>
  )
}

export function ErrorMessage({ error, onRetry }) {
  const message =
    error?.data?.error ||
    (error?.status === 'TIMEOUT_ERROR'
      ? 'Сервис не ответил вовремя. Попробуйте ещё раз.'
      : 'Не удалось загрузить данные. Проверьте подключение и повторите запрос.')

  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
    >
      <p className="leading-relaxed">{message}</p>
      <button
        onClick={onRetry}
        className="mt-3 font-semibold underline decoration-red-300 underline-offset-4 hover:decoration-red-900"
      >
        Повторить
      </button>
    </div>
  )
}
