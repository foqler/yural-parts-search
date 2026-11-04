export async function searchParts({ key, number, brand }) {
  const url = new URL('https://api.favorit-parts.ru/hs/hsprice/')
  url.search = new URLSearchParams({ key, number })

  if (brand) {
    url.searchParams.set('brand', brand)
    url.searchParams.set('analogues', 'on')
  }

  const signal = AbortSignal.timeout(12000)
  let response, data
  try {
    response = await fetch(url, { signal, redirect: 'error' })
    data = await response.json().catch((error) => {
      if (error.name === 'SyntaxError') return null
      throw error
    })
  } catch (error) {
    if (signal.aborted || error.name === 'TimeoutError')
      throw new Error('Сервис не ответил вовремя. Попробуйте ещё раз.')
    throw new Error('Не удалось связаться с Favorit Parts. Попробуйте ещё раз.')
  }

  if (data?.error) {
    const message = String(data.error)
    if (message.includes('Invalid key') || message.includes('Empty key')) {
      throw new Error('Ключ API недействителен. Проверьте настройки сервера.')
    }
    if (message.includes('quota'))
      throw new Error('Превышен лимит запросов. Повторите поиск позже.')
    if (message.includes('Empty number')) throw new Error('Укажите артикул детали.')
    throw new Error('Favorit Parts не смог выполнить поиск. Попробуйте ещё раз.')
  }

  if (!response.ok) throw new Error(`Favorit Parts временно недоступен (HTTP ${response.status}).`)
  if (!Array.isArray(data?.goods)) throw new Error('Сервис вернул неожиданный формат ответа.')
  return data
}
