import resourceApi from '@/utils/resourceApi'
import ApiCallResult from '@/utils/apiCallResult'
import { ApiEndpoints } from '@/constants/apiEndpoints'
import type { User } from '@/types/user'

export const userApiService = {
  async getAllUsers(): Promise<ApiCallResult<User[]>> {
    try {
      const response = await resourceApi.get<User[]>(ApiEndpoints.USERS)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async getUserById(id: string): Promise<ApiCallResult<User>> {
    try {
      const response = await resourceApi.get<User>(ApiEndpoints.USER_BY_ID(id))
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  },

  async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiCallResult<User>> {
    try {
      const response = await resourceApi.post<User>(ApiEndpoints.USERS, user)
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}
