export interface Task {
  id: string
  projectId: string
  title: string
  description?: string
  status: `backlog` | `todo` | `inprogress` | `done`
  order: number // for sorting within column
  createdAt: string
  updatedAt: string
}

export type TaskStatus = Task[`status`]

export interface TaskFormData {
  title: string
  description: string
}
