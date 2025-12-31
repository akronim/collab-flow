import session from 'express-session'
import ms from 'ms'
import config from '../config'
import { getDefaultDb } from '../db'
import { PostgresSessionStore } from '../services/postgresSessionStore.service'
import { SESSION_COOKIE_NAME } from '../constants'

// Use PostgreSQL session store with default database connection
const sessionStore = new PostgresSessionStore(getDefaultDb().sql)

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

// Export for logout-all-devices functionality
export { sessionStore }
