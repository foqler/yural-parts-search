import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { expect, it, vi } from 'vitest'
import App from './App'
import { createStore } from './store'

const item = {
  goodsID: '1',
  brand: 'MEYLE',
  number: '123',
  name: 'Масляный фильтр',
  warehouses: [{ id: 'a', code: 'КРД', price: 850, stock: 4 }],
}

function setup(respond = () => ({ goods: [item] })) {
  const requests = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request) => {
      const url = new URL(typeof request === 'string' ? request : request.url)
      if (url.pathname.endsWith('/config')) return Response.json({ demo: true })
      requests.push(url)
      const data = await respond(url)
      return data instanceof Response ? data : Response.json(data)
    }),
  )
  const store = createStore()
  render(
    <Provider store={store}>
      <App />
    </Provider>,
  )
  return { user: userEvent.setup(), requests, store }
}

it('проходит два этапа поиска и показывает цену и остаток выбранного склада', async () => {
  const { user, requests } = setup()
  await user.type(screen.getByLabelText('Артикул детали'), '123')
  await user.click(await screen.findByRole('button', { name: 'MEYLE', exact: true }))

  const table = await screen.findByRole('table')
  expect(within(table).getByText('Масляный фильтр')).toBeInTheDocument()
  expect(within(table).getByText(/850/)).toHaveTextContent('850')
  expect(within(table).getByText('4 шт.')).toBeInTheDocument()
  expect(requests[0].searchParams.get('number')).toBe('123')
  expect(requests[0].searchParams.has('brand')).toBe(false)
  expect(requests[1].searchParams.get('brand')).toBe('MEYLE')
})

it('объединяет быстрый ввод в один запрос и не ищет пустую строку', async () => {
  const { user, requests } = setup()
  const input = screen.getByLabelText('Артикул детали')
  await user.type(input, '123456')
  await screen.findByRole('button', { name: 'MEYLE', exact: true })
  expect(requests).toHaveLength(1)
  expect(requests[0].searchParams.get('number')).toBe('123456')

  await user.clear(input)
  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(requests).toHaveLength(1)
  expect(screen.queryByRole('button', { name: 'MEYLE', exact: true })).not.toBeInTheDocument()
})

it('очищает предложения сразу после изменения артикула', async () => {
  const { user } = setup()
  const input = screen.getByLabelText('Артикул детали')
  await user.type(input, '123')
  await user.click(await screen.findByRole('button', { name: 'MEYLE', exact: true }))
  await screen.findByRole('table')

  await user.type(input, '4')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'MEYLE', exact: true })).not.toBeInTheDocument()
})

it('показывает пустой результат для документированной пустой структуры', async () => {
  const { user } = setup(() => ({ goods: [{}] }))
  await user.type(screen.getByLabelText('Артикул детали'), 'unknown')

  expect(await screen.findByText('Производители не найдены')).toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})

it('после сетевой ошибки позволяет повторить запрос', async () => {
  let failed = false
  const { user } = setup(() => {
    if (!failed) {
      failed = true
      throw new TypeError('Failed to fetch')
    }
    return { goods: [item] }
  })
  await user.type(screen.getByLabelText('Артикул детали'), '123')
  expect(await screen.findByRole('alert')).toHaveTextContent('Проверьте подключение')
  await user.click(screen.getByRole('button', { name: 'Повторить' }))

  expect(await screen.findByRole('button', { name: 'MEYLE', exact: true })).toBeInTheDocument()
})

it('не заменяет новые результаты запоздавшим ответом старого запроса', async () => {
  let finishOldRequest
  const { user, requests } = setup((url) => {
    if (url.searchParams.get('number') === 'old') {
      return new Promise((resolve) => {
        finishOldRequest = resolve
      })
    }
    return { goods: [{ ...item, brand: 'NEW' }] }
  })
  const input = screen.getByLabelText('Артикул детали')
  await user.type(input, 'old')
  await waitFor(() => expect(requests).toHaveLength(1))
  await user.clear(input)
  await user.type(input, 'new')
  await screen.findByRole('button', { name: 'NEW', exact: true })

  await act(async () => {
    finishOldRequest({ goods: [{ ...item, brand: 'OLD' }] })
  })
  expect(screen.getByRole('button', { name: 'NEW', exact: true })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'OLD', exact: true })).not.toBeInTheDocument()
})
