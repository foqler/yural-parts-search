import { Router } from 'express'
import { searchParts } from './favorit.js'
import { searchDemo } from './demo.js'

export function createApiRouter(key = '00000000-0000-0000-0000-000000000001') {
  const router = Router()

  router.use((request, response, next) => {
    response.set('Cache-Control', 'no-store')
    next()
  })

  router.get('/config', (request, response) => {
    response.json({ demo: !key })
  })

  router.get('/search', async (request, response) => {
    const number = typeof request.query.number === 'string' ? request.query.number.trim() : ''
    const brand = typeof request.query.brand === 'string' ? request.query.brand.trim() : ''

    if (!number || number.length > 100 || brand.length > 100) {
      return response
        .status(400)
        .json({ error: 'Укажите корректный артикул и производителя (до 100 символов).' })
    }

    try {
      if (!key) {
        await new Promise((resolve) => setTimeout(resolve, 300))
        return response.json(searchDemo(number, brand))
      }
      response.json(await searchParts({ key, number, brand }))
    } catch (error) {
      response.status(502).json({ error: error.message })
    }
  })

  return router
}
