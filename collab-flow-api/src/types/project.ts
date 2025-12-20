/**
 * ProjectRow represents what is stored in the database.
 * Does not include computed fields like taskCount.
 */
export interface ProjectRow {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

/**
 * Project is the API response type.
 * Extends ProjectRow with computed fields.
 */
export interface Project extends ProjectRow {
  taskCount: number
}
