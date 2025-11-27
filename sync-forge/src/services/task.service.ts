import resourceApi from '@/utils/resourceApi'
import ApiCallResult from '@/utils/apiCallResult'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import type { Task } from '@/types/task'

export const taskApiService = {
  async getAllTasks(): Promise<ApiCallResult<Task[]>> {
    try {
      const response = await resourceApi.get<Task[]>(ApiEndpoints.TASKS)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getTaskById(id: string): Promise<ApiCallResult<Task>> {
    try {
      const response = await resourceApi.get<Task>(ApiEndpoints.TASK_BY_ID(id))
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiCallResult<Task>> {
    try {
      const response = await resourceApi.post<Task>(ApiEndpoints.TASKS, task)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
