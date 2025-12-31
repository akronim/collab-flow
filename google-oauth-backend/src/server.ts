import express, { type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import apiRouter from './routes'
import helmet from 'helmet'
import { errorMiddleware } from './middleware/error.middleware'
import { csrfMiddleware } from './middleware/csrf.middleware'
import { sessionMiddleware } from './middleware/session.middleware'
import { setupGracefulShutdown } from './server/graceful-shutdown'
import { closeDefaultConnection } from './db'
import config from './config'
import Logger from './utils/logger'

const app = express()

app.use(helmet())

app.use(
  cors({
    origin: [config.cors.origin],
    credentials: true
  })
)

app.use(express.json())
app.use(cookieParser())
app.use(sessionMiddleware)
app.use(csrfMiddleware)

app.get(`/`, (req: Request, res: Response) => {
  res.json({ status: `OK`, message: `OAuth Backend Running` })
})

app.get(`/health`, (req: Request, res: Response) => {
  res.json({
    status: `OK`,
    service: `oauth-gateway`,
    downstream: config.collabFlowApiUrl
  })
})

app.use(`/api`, apiRouter)

app.use(errorMiddleware)

const server = app.listen(config.port, () => {
  Logger.log(`Backend running on http://localhost:${config.port}`)
  Logger.log(`API routes available under /api`)
})

setupGracefulShutdown(server, closeDefaultConnection)

export default app
