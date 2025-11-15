import express, { type Request, type Response } from 'express'
import cors from 'cors'
import apiRouter from './routes' 
import helmet from 'helmet' 
import { errorMiddleware } from './middleware/error.middleware'
import config from './config'

const app = express()

app.use(helmet()) 

app.use(
    cors({
        origin: [config.cors.origin],
        credentials: true,
    })
)

app.use(express.json())

app.get('/', (req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'OAuth Backend Running' })
})

app.use('/api', apiRouter)

app.use(errorMiddleware);

app.listen(config.port, () => {
    console.log(`Backend running on http://localhost:${config.port}`)
    console.log(`API routes available under /api`) 
})

export default app
