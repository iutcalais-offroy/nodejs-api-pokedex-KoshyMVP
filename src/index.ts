import { createServer } from 'http'
import { env } from './env'
import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { authRouter } from './auth/routes/auth.route'
import { cardRouter } from './cards/routes/card.route'
import { deckRouter } from './decks/routes/deck.route'
import { swaggerDocument } from './docs'

// Create Express app
export const app = express()

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
)

app.use(express.json())

// Documentation Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
  }),
)

// Serve static files (Socket.io test client)
app.use(express.static('public'))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/cards', cardRouter)
app.use('/api/decks', deckRouter)

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'TCG Backend Server is running' })
})

// Start server only if this file is run directly
if (require.main === module) {
  const httpServer = createServer(app)

  try {
    httpServer.listen(env.PORT, () => {
      console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`)
      console.log(
        `🧪 Socket.io Test Client available at http://localhost:${env.PORT}`,
      )
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}
