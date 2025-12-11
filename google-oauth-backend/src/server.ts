import express, { type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import ms from 'ms'
import apiRouter from './routes'
import helmet from 'helmet'
import { errorMiddleware } from './middleware/error.middleware'
import config from './config'
import Logger from './utils/logger'
import { sessionStore } from './services/sessionStore.service'

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

app.use(
  session({
    store: sessionStore,
    secret: config.session.secret,
    name: `collabflow.sid`,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === `production`,
      sameSite: `lax`,
      maxAge: ms(config.session.maxAge)
    }
  })
)

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

app.listen(config.port, () => {
  Logger.log(`Backend running on http://localhost:${config.port}`)
  Logger.log(`API routes available under /api`) 
})

export default app
