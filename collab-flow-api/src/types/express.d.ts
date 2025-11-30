// This file extends the Express Request type to include the 'user' property.

import type { JwtPayload } from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
    }
  }
}
