import { describe, it, expect, vi, beforeEach } from 'vitest'
import ApiCallResult from '@/utils/apiCallResult'
import type { AxiosError } from 'axios'
import { defineComponent, h, onMounted, ref, type DefineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'

describe(`ApiCallResult`, () => {
  it(`should create a successful result with data`, () => {
    const data = { key: `value` }
    const extras = JSON.stringify({ foo: `bar` })
    const result = ApiCallResult.Success(data, 200, extras)

    expect(result.success).toBe(true)
    expect(result.data).toStrictEqual(data)
    expect(result.error).toBeNull()
    expect(result.statusCode).toBe(200)
    expect(result.extras).toStrictEqual(extras)
  })

  it(`should create a successful void result`, () => {
    const result = ApiCallResult.SuccessVoid(204, `Extras`)

    expect(result.success).toBe(true)
    expect(result.data).toBeNull()
    expect(result.error).toBeNull()
    expect(result.statusCode).toBe(204)
    expect(result.extras).toBe(`Extras`)
  })

  it(`should create a failed result with an error`, () => {
    const error: AxiosError = {
      isAxiosError: true,
      toJSON: () => ({}),
      name: `AxiosError`,
      message: `An error occurred`,
      config: {},
      response: {
        status: 404,
        statusText: `Not Found`,
        headers: {},
        config: {},
        data: null
      }
    } as AxiosError

    const result = ApiCallResult.Fail(error, `Extras`)

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe(error)
    expect(result.statusCode).toBe(404)
    expect(result.extras).toBe(`Extras`)
  })

  it(`should create a failed result with a default status code of 500`, () => {
    const error = new Error(`An error occurred`)
    const result = ApiCallResult.Fail(error)

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe(error)
    expect(result.statusCode).toBe(500)
    expect(result.extras).toBe(``)
  })

  it(`should check if the result is successful - it is`, () => {
    const result = ApiCallResult.Success({ key: `value` })

    expect(result.isSuccess()).toBe(true)
    expect(result.data).toStrictEqual({ key: `value` })
  })

  it(`should check if the result is successful - it is not`, () => {
    const error = new Error(`An error occurred`)
    const result = ApiCallResult.Fail(error)

    expect(result.isSuccess()).toBe(false)
  })
})

const mockApiService = {
  fetchData: async (): Promise<ApiCallResult<{ id: number; name: string }>> => {
    try {
      interface Response {
        data: { id: number; name: string };
        status: number;
      }
      const response: Response = await new Promise((resolve) =>
        resolve({ data: { id: 1, name: `MockData` }, status: 200 })
      )
      return ApiCallResult.Success(response.data, response.status)
    } catch (error) {
      return ApiCallResult.Fail(error)
    }
  }
}

describe(`ApiCallResult with mock API service`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it(`should handle a successful API response`, async () => {
    vi.spyOn(mockApiService, `fetchData`).mockResolvedValue(
      ApiCallResult.Success({ id: 1, name: `Test` }, 200)
    )

    const result = await mockApiService.fetchData()

    expect(result.isSuccess()).toBe(true)
    expect(result.success).toBe(true)
    expect(result.data).toStrictEqual({ id: 1, name: `Test` })
    expect(result.error).toBeNull()
    expect(result.statusCode).toBe(200)
  })

  it(`should handle an API error response`, async () => {
    const mockError: AxiosError = {
      isAxiosError: true,
      toJSON: () => ({}),
      name: `AxiosError`,
      message: `An error occurred`,
      config: {},
      response: {
        status: 404,
        statusText: `Not Found`,
        headers: {},
        config: {},
        data: null
      }
    } as AxiosError

    vi.spyOn(mockApiService, `fetchData`).mockResolvedValue(
      ApiCallResult.Fail(mockError)
    )

    const result = await mockApiService.fetchData()

    expect(result.isSuccess()).toBe(false)
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe(mockError)
    expect(result.statusCode).toBe(404)
  })

  it(`should handle an unknown error response`, async () => {
    const mockError = new Error(`Something went wrong`)

    vi.spyOn(mockApiService, `fetchData`).mockResolvedValue(
      ApiCallResult.Fail(mockError)
    )

    const result = await mockApiService.fetchData()

    expect(result.isSuccess()).toBe(false)
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe(mockError)
    expect(result.statusCode).toBe(500)
  })
})

describe(`ApiCallResult with inline mock component and service`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const testComponent = (): DefineComponent => {
    return defineComponent({
      setup () {
        const data = ref<string | null>(null)
        const error = ref<string | null>(null)
        const loading = ref(false)
        const apiCallSuccess = ref(false)
        const apiCallIsSuccess = ref(false)

        const fetchData = async (): Promise<void> => {
          loading.value = true
          error.value = null
          data.value = null

          const apiCall = await mockApiService.fetchData()

          apiCallSuccess.value = apiCall.success
          apiCallIsSuccess.value = apiCall.isSuccess()

          if (apiCall.isSuccess()) {
            data.value = JSON.stringify(apiCall.data)
          } else {
            error.value = (apiCall.error as AxiosError)?.message || `An unknown error occurred`
          }

          loading.value = false
        }

        onMounted(async () => {
          await fetchData()
        })

        return { data, error, loading, fetchData, apiCallSuccess, apiCallIsSuccess }
      },
      render () {
        return h(`div`)
      }
    })
  }

  it(`should handle a successful API response`, async () => {
    const mockData = { id: 1, name: `Test` }
    vi.spyOn(mockApiService, `fetchData`).mockResolvedValue(
      ApiCallResult.Success(mockData, 200)
    )

    const wrapper = mount(testComponent())

    await flushPromises()

    const { data, error, loading, apiCallSuccess, apiCallIsSuccess } = wrapper.vm

    expect(apiCallSuccess).toBe(true)
    expect(apiCallIsSuccess).toBe(true)
    expect(loading).toBe(false)
    expect(error).toBeNull()
    expect(data).toBe(JSON.stringify(mockData))
  })

  it(`should handle an API error response`, async () => {
    const mockError: AxiosError = {
      isAxiosError: true,
      toJSON: () => ({}),
      name: `AxiosError`,
      message: `An error occurred`,
      config: {},
      response: {
        status: 404,
        statusText: `Not Found`,
        headers: {},
        config: {},
        data: null
      }
    } as AxiosError

    vi.spyOn(mockApiService, `fetchData`).mockResolvedValue(
      ApiCallResult.Fail(mockError)
    )

    const wrapper = mount(testComponent())

    await flushPromises()

    const { data, error, loading, apiCallSuccess, apiCallIsSuccess } = wrapper.vm

    expect(apiCallSuccess).toBe(false)
    expect(apiCallIsSuccess).toBe(false)
    expect(loading).toBe(false)
    expect(data).toBeNull()
    expect(error).toBe(`An error occurred`)
  })

  it(`should handle an unknown error response`, async () => {
    const mockError = new Error(`Something went wrong`)
    vi.spyOn(mockApiService, `fetchData`).mockResolvedValue(
      ApiCallResult.Fail(mockError)
    )

    const wrapper = mount(testComponent())

    await flushPromises()

    const { data, error, loading, apiCallSuccess, apiCallIsSuccess } = wrapper.vm

    expect(apiCallSuccess).toBe(false)
    expect(apiCallIsSuccess).toBe(false)
    expect(loading).toBe(false)
    expect(data).toBeNull()
    expect(error).toBe(`Something went wrong`)
  })
})
