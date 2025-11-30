import { collabFlowApi } from '@/utils/api.gateway'
import ApiCallResult from '@/utils/apiCallResult'
import { CollabFlowApiEndpoints } from '@/constants/apiEndpoints'
import type { Project } from '@/types/project'

// TODO - tests with msw
export const projectApiService = {
  async getAllProjects(): Promise<ApiCallResult<Project[]>> {
    try {
      const response = await collabFlowApi.get<Project[]>(CollabFlowApiEndpoints.PROJECTS)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getProjectById(id: string): Promise<ApiCallResult<Project>> {
    try {
      const response = await collabFlowApi.get<Project>(CollabFlowApiEndpoints.PROJECT_BY_ID(id))
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async createProject(project: Omit<Project, `id` | `createdAt`>): Promise<ApiCallResult<Project>> {
    try {
      const response = await collabFlowApi.post<Project>(CollabFlowApiEndpoints.PROJECTS, project)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
