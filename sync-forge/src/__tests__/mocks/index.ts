import type { Project } from "@/types/project"
import type { Task } from "@/types/task"

export const mockTimeZone = `Europe/Zagreb`

export const mockTasks: Task[] = [
  {
    id: `task-1`,
    title: `Task 1`,
    status: `todo`,
    projectId: `proj-1`,
    order: 0,
    assigneeId: null,
    description: ``,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `task-2`,
    title: `Task 2`,
    status: `todo`,
    projectId: `proj-1`,
    order: 1,
    assigneeId: null,
    description: ``,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: `task-3`,
    title: `Task 3`,
    status: `todo`,
    projectId: `proj-1`,
    order: 2,
    assigneeId: null,
    description: ``,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const mockProjects: Project[] = [
  {
    id: `proj-1`,
    name: `Website Redesign`,
    description: `Update marketing site`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    taskCount: 3
  }
]
