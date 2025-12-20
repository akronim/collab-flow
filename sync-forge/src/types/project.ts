export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  taskCount: number
}

export type ProjectFormData = Pick<Project, `name` | `description`>
