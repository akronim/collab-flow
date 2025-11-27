import { type User } from './user'

export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: `backlog` | `todo` | `inprogress` | `done`
  order: number
  assignee?: User
  createdAt: string
  updatedAt: string
}

export type TaskStatus = Task[`status`]
