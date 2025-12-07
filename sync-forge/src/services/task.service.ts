import { authApiClient } from '@/services/authApiClient'
import ApiCallResult from '@/utils/apiCallResult'
import { CollabFlowApiEndpoints } from '@/constants/apiEndpoints'
import type { Task } from '@/types/task'

export const taskApiService = {
  async getAllTasks(): Promise<ApiCallResult<Task[]>> {
    try {
      const response = await authApiClient.get<Task[]>(CollabFlowApiEndpoints.TASKS)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getTasksByProjectId(projectId: string): Promise<ApiCallResult<Task[]>> {
    try {
      const response = await authApiClient.get<Task[]>(
        `${CollabFlowApiEndpoints.TASKS}?projectId=${projectId}`
      )
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getTaskById(id: string): Promise<ApiCallResult<Task>> {
    try {
      const response = await authApiClient.get<Task>(CollabFlowApiEndpoints.TASK_BY_ID(id))
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async createTask(task: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<ApiCallResult<Task>> {
    try {
      const response = await authApiClient.post<Task>(CollabFlowApiEndpoints.TASKS, task)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<ApiCallResult<Task>> {
    try {
      const response = await authApiClient.put<Task>(CollabFlowApiEndpoints.TASK_BY_ID(id), updates)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async deleteTask(id: string): Promise<ApiCallResult<void>> {
    try {
      const response = await authApiClient.delete(CollabFlowApiEndpoints.TASK_BY_ID(id))
      return ApiCallResult.Success(undefined, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
