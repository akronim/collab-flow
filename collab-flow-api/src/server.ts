import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import config from './config'
import Logger from './utils/logger'
import mainRouter from './routes'
import { errorMiddleware } from './middleware/error.middleware'

const app = express()
const PORT = config.port 

app.use(express.json())
app.use(cors())
app.use(helmet())

app.use(`/api`, mainRouter)

app.use(errorMiddleware) 

app.listen(PORT, () => {
  Logger.log(`Server running on port ${PORT}`)
})

export default app
