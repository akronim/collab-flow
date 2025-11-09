import express, { type Request, type Response } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import axios from 'axios'

dotenv.config()

const app = express()

app.use(
    cors({
        origin: ['http://localhost:5173'],
        credentials: true,
    })
)

app.use(express.json())

app.get('/', (req: Request, res: Response) => {
    res.json({ status: 'OK', message: 'OAuth Backend Running' })
})

interface TokenRequest {
    code: string
    codeVerifier: string
}

app.post('/api/auth/token', async (req: Request<{}, {}, TokenRequest>, res: Response) => {
    const { code, codeVerifier } = req.body

    if (!code || !codeVerifier) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Missing code or codeVerifier',
        })
    }

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: process.env.REDIRECT_URI || 'http://localhost:5173/auth/callback',
        grant_type: 'authorization_code',
        code,
        code_verifier: codeVerifier,
    })

    try {
        const response = await axios.post(
            'https://oauth2.googleapis.com/token',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000,
            }
        )

        const { access_token, refresh_token, expires_in, id_token } = response.data

        res.json({
            access_token,
            refresh_token,
            expires_in,
            id_token,
            expires_at: Date.now() + expires_in * 1000,
        })
    } catch (error: any) {
        console.error('Token exchange failed:', error.response?.data || error.message)

        const details = error.response?.data || { message: error.message }

        res.status(error.response?.status || 500).json({
            error: 'Token exchange failed',
            details,
        })
    }
})

app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    const { refresh_token } = req.body
    if (!refresh_token) {
        return res.status(400).json({ error: 'Missing refresh_token' })
    }

    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token,
    })

    try {
        const response = await axios.post(
            'https://oauth2.googleapis.com/token',
            params.toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000
            }
        )
        res.json(response.data)
    } catch (error: any) {
        console.error('Refresh failed:', error.response?.data)
        res.status(400).json({ error: 'Refresh failed', details: error.response?.data })
    }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`)
    console.log(`POST /api/auth/token → Google OAuth2 Token Exchange`)
})