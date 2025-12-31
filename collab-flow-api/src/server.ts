import express from 'express'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import config from './config'
import Logger from './utils/logger'
import mainRouter from './routes'
import { errorMiddleware } from './middleware/error.middleware'
import { swaggerSpec } from './config/swagger'
import { closeDefaultConnection } from './db'
import { setupGracefulShutdown } from './server/graceful-shutdown'

const app = express()
const PORT = config.port

app.use(express.json())
app.use(helmet())

app.use(`/api-docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec))
app.use(`/api`, mainRouter)

app.use(errorMiddleware)

const server = app.listen(PORT, () => {
  Logger.log(`Server running on port ${PORT}`)
})

setupGracefulShutdown(server, closeDefaultConnection)

export default app
