export type UserRole = `admin` | `member` | `guest`
export type UserStatus = `active` | `inactive` | `suspended`

export interface User {
  id: string
  googleUserId?: string
  name: string
  email: string
  avatar?: string
  role: UserRole
  title?: string
  organization?: string
  status: UserStatus
  lastLogin?: string
  createdAt: string
  updatedAt: string
}
