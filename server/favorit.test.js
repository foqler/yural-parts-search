import { expect, it, vi } from 'vitest'
import { searchParts } from './favorit'

it('передаёт ключ и артикул через URLSearchParams, добавляет аналоги при выборе бренда', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ goods: [{}] })))
  vi.stubGlobal('fetch', fetch)

  await searchParts({ key: 'test-key', number: 'AB#12', brand: 'A&B' })

  expect(fetch).toHaveBeenCalledOnce()
  const url = new URL(fetch.mock.calls[0][0])
  expect(url.protocol).toBe('https:')
  expect(Object.fromEntries(url.searchParams)).toEqual({
    key: 'test-key',
    number: 'AB#12',
    brand: 'A&B',
    analogues: 'on',
  })
})

it('первый запрос не передаёт бренд и аналоги', async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ goods: [] })))
  vi.stubGlobal('fetch', fetch)

  await searchParts({ key: 'test-key', number: '123' })

  expect(fetch).toHaveBeenCalledOnce()
  expect(new URL(fetch.mock.calls[0][0]).searchParams.has('brand')).toBe(false)
})

it('распознаёт ошибку API даже при HTTP 200', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Invalid key client!' }))),
  )

  await expect(searchParts({ key: 'bad', number: '123' })).rejects.toThrow(
    'Ключ API недействителен',
  )
})

it('объясняет превышение квоты', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Request quota exceeded!' }))),
  )

  await expect(searchParts({ key: 'test', number: '123' })).rejects.toThrow('лимит запросов')
})

it('отклоняет ответ неожиданного формата', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ unexpected: true }))),
  )

  await expect(searchParts({ key: 'test', number: '123' })).rejects.toThrow('неожиданный формат')
})

it('обрабатывает HTTP-сбой сервиса', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 })))

  await expect(searchParts({ key: 'test', number: '123' })).rejects.toThrow('503')
})

it('не раскрывает ключ при сетевой ошибке', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('URL contains secret-key')))

  await expect(searchParts({ key: 'secret-key', number: '123' })).rejects.toThrow(
    'Не удалось связаться',
  )
})

it('читает причину ошибки из JSON при HTTP 403', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ error: 'Invalid key client!' }, { status: 403 })),
  )

  await expect(searchParts({ key: 'bad', number: '123' })).rejects.toThrow(
    'Ключ API недействителен',
  )
})

it('распознаёт таймаут при загрузке тела ответа', async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.error(new DOMException('Timed out', 'TimeoutError'))
    },
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)))

  await expect(searchParts({ key: 'test', number: '123' })).rejects.toThrow('не ответил вовремя')
})
