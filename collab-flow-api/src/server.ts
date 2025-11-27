import express, { type Request, type Response, type NextFunction } from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import helmet from 'helmet'

import Logger from './utils/logger'
import mainRouter from './routes'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())
app.use(cors())
app.use(helmet())

app.use(`/api`, mainRouter)

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err.name === `UnauthorizedError`) {
    res.status(401).json({ message: `Invalid or missing token` })
  } else {
    Logger.error(err.stack)
    // do I need to return it?
    res.status(500).json({ message: `Internal Server Error` })
  }
})

app.listen(PORT, () => {
  Logger.log(`Server running on port ${PORT}`)
})

export default app
