import http from 'node:http'
import express from 'express'
import { afterEach, expect, it, vi } from 'vitest'
import { createApiRouter } from './api'

const servers = []

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))),
  )
})

async function request(path, key = '') {
  const app = express()
  app.use('/api', createApiRouter(key))
  const server = app.listen(0, '127.0.0.1')
  servers.push(server)
  await new Promise((resolve) => server.once('listening', resolve))

  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${server.address().port}${path}`, (response) => {
        let body = ''
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          let data
          try {
            data = JSON.parse(body)
          } catch {
            data = body
          }
          resolve({ status: response.statusCode, data })
        })
      })
      .on('error', reject)
  })
}

it('сообщает о демо-режиме без раскрытия ключа', async () => {
  expect(await request('/api/config')).toEqual({ status: 200, data: { demo: true } })
  expect(await request('/api/config', 'secret')).toEqual({ status: 200, data: { demo: false } })
})

it('проверяет артикул перед обращением к внешнему API', async () => {
  const response = await request('/api/search?number=%20')
  expect(response.status).toBe(400)
  expect(response.data.error).toContain('артикул')
})

it('демо проходит оба этапа через HTTP с вложенными аналогами', async () => {
  const brands = await request('/api/search?number=01089')
  expect(brands.status).toBe(200)
  expect(brands.data.goods.map((item) => item.brand)).toEqual(['FEBI', 'SWAG'])
  const offers = await request('/api/search?number=01089&brand=FEBI')
  expect(offers.status).toBe(200)
  expect(offers.data.goods).toHaveLength(1)
  expect(offers.data.goods[0].analogues.length).toBeGreaterThan(0)
})

it('неизвестный артикул в демо возвращает пустую структуру из документации', async () => {
  const response = await request('/api/search?number=UNKNOWN')
  expect(response).toEqual({ status: 200, data: { goods: [{}] } })
})

it('с настроенным ключом использует настоящий клиент, не подменяет сбой демо-данными', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
  const response = await request('/api/search?number=01089', 'secret')
  expect(response.status).toBe(502)
  expect(response.data.error).toContain('Не удалось связаться')
  expect(JSON.stringify(response)).not.toContain('secret')
})
