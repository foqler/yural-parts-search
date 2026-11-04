import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApiRouter } from './api.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const app = express()
const port = Number(process.env.PORT) || 5173

app.disable('x-powered-by')
app.use('/api', createApiRouter(process.env.FAVORIT_API_KEY?.trim()))

if (process.argv.includes('--production')) {
  app.use(express.static(path.join(root, 'dist')))
} else {
  const { createServer } = await import('vite')
  const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' })
  app.use(vite.middlewares)
}

app.listen(port, '127.0.0.1', () => {
  console.log(`Приложение запущено: http://localhost:${port}`)
})
