import express from 'express'
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

app.listen(PORT, () => {
  Logger.log(`Server running on port ${PORT}`)
})
