import resourceApi from '@/utils/resourceApi'
import ApiCallResult from '@/utils/apiCallResult'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import type { Project } from '@/types/project'

export const projectApiService = {
  async getAllProjects(): Promise<ApiCallResult<Project[]>> {
    try {
      const response = await resourceApi.get<Project[]>(ApiEndpoints.PROJECTS)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getProjectById(id: string): Promise<ApiCallResult<Project>> {
    try {
      const response = await resourceApi.get<Project>(ApiEndpoints.PROJECT_BY_ID(id))
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<ApiCallResult<Project>> {
    try {
      const response = await resourceApi.post<Project>(ApiEndpoints.PROJECTS, project)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
