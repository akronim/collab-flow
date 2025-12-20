import { apiClient } from '@/http/apiClient'
import ApiCallResult from '@/utils/apiCallResult'
import { CollabFlowApiEndpoints } from '@/constants/apiEndpoints'
import type { Project } from '@/types/project'

// TODO - tests with msw
export const projectApiService = {
  async getAllProjects(): Promise<ApiCallResult<Project[]>> {
    try {
      const response = await apiClient.get<Project[]>(CollabFlowApiEndpoints.PROJECTS)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getProjectById(id: string): Promise<ApiCallResult<Project>> {
    try {
      const response = await apiClient.get<Project>(CollabFlowApiEndpoints.PROJECT_BY_ID(id))
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async createProject(
    project: Omit<Project, `id` | `createdAt` | `updatedAt` | `taskCount`>
  ): Promise<ApiCallResult<Project>> {
    try {
      const response = await apiClient.post<Project>(CollabFlowApiEndpoints.PROJECTS, project)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async updateProject(
    id: string,
    project: Partial<Omit<Project, `id` | `createdAt` | `updatedAt` | `taskCount`>>
  ): Promise<ApiCallResult<Project>> {
    try {
      const response = await apiClient.put<Project>(CollabFlowApiEndpoints.PROJECT_BY_ID(id), project)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async deleteProject(id: string): Promise<ApiCallResult<void>> {
    try {
      const response = await apiClient.delete(CollabFlowApiEndpoints.PROJECT_BY_ID(id))
      return ApiCallResult.SuccessVoid(response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
