import session from 'express-session'
import ms from 'ms'
import config from '../config'
import { sessionStore } from '../services/sessionStore.service'
import { SESSION_COOKIE_NAME } from '../constants'

export const sessionMiddleware = session({
  store: sessionStore,
  secret: config.session.secret,
  name: SESSION_COOKIE_NAME,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: config.nodeEnv === `production`,
    sameSite: `lax`,
    maxAge: ms(config.session.maxAge)
  }
})
