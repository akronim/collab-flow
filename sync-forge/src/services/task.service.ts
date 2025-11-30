import { collabFlowApi } from '@/utils/api.gateway'
import ApiCallResult from '@/utils/apiCallResult'
import { CollabFlowApiEndpoints } from '@/constants/apiEndpoints'
import type { Task } from '@/types/task'

// TODO - tests with msw
export const taskApiService = {
  async getAllTasks(): Promise<ApiCallResult<Task[]>> {
    try {
      const response = await collabFlowApi.get<Task[]>(CollabFlowApiEndpoints.TASKS)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getTaskById(id: string): Promise<ApiCallResult<Task>> {
    try {
      const response = await collabFlowApi.get<Task>(CollabFlowApiEndpoints.TASK_BY_ID(id))
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async createTask(task: Omit<Task, `id` | `createdAt` | `updatedAt`>): Promise<ApiCallResult<Task>> {
    try {
      const response = await collabFlowApi.post<Task>(CollabFlowApiEndpoints.TASKS, task)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
