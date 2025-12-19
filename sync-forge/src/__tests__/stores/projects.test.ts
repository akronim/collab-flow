import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useProjectStore } from '@/stores'
import { mockProjects } from '../mocks'
import { projectApiService } from '@/services/project.service'
import ApiCallResult from '@/utils/apiCallResult'
import * as notificationHelper from '@/utils/notificationHelper'
import { NotificationMessages } from '@/constants/notificationMessages'
import type { Project } from '@/types/project'

vi.mock(import(`@/services/project.service`))
vi.mock(import(`@/utils/notificationHelper`))

describe(`useProjectStore`, () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe(`getters`, () => {
    it(`getProjectById should return a project by id`, () => {
      const store = useProjectStore()
      store.projects = mockProjects
      const project = store.getProjectById(mockProjects[0]?.id ?? ``)

      expect(project).toStrictEqual(mockProjects[0])
    })

    it(`getProjectById should return undefined for a non-existent project`, () => {
      const store = useProjectStore()
      store.projects = mockProjects
      const project = store.getProjectById(`non-existent-id`)

      expect(project).toBeUndefined()
    })
  })

  describe(`actions`, () => {
    describe(`fetchProjects`, () => {
      it(`should fetch and set projects on success`, async () => {
        const store = useProjectStore()
        vi.mocked(projectApiService.getAllProjects).mockResolvedValue(ApiCallResult.Success(mockProjects))
        
        await store.fetchProjects()
        
        expect(store.projects).toStrictEqual(mockProjects)
        expect(projectApiService.getAllProjects).toHaveBeenCalledTimes(1)
      })

      it(`should show an error notification on failure`, async () => {
        const store = useProjectStore()
        const error = new Error(`Failed to fetch`)
        vi.mocked(projectApiService.getAllProjects).mockResolvedValue(ApiCallResult.Fail(error))
        
        await store.fetchProjects()
        
        expect(store.projects).toStrictEqual([])
        expect(notificationHelper.showErrorNotification).toHaveBeenCalledWith(error, NotificationMessages.FETCH_FAILED)
      })
    })

    describe(`fetchProjectById`, () => {
      it(`should return a project on success`, async () => {
        const store = useProjectStore()
        const project = mockProjects[0]
        vi.mocked(projectApiService.getProjectById).mockResolvedValue(ApiCallResult.Success(project))

        const result = await store.fetchProjectById(project?.id ?? ``)

        expect(result).toStrictEqual(project)
        expect(projectApiService.getProjectById).toHaveBeenCalledWith(project?.id ?? ``)
      })

      it(`should show an error notification on failure`, async () => {
        const store = useProjectStore()
        const error = new Error(`Failed to fetch`)
        vi.mocked(projectApiService.getProjectById).mockResolvedValue(ApiCallResult.Fail(error))

        const result = await store.fetchProjectById(`some-id`)

        expect(result).toBeUndefined()
        expect(notificationHelper.showErrorNotification).toHaveBeenCalledWith(error, NotificationMessages.FETCH_FAILED)
      })
    })

    describe(`addProject`, () => {
      it(`should call createProject and show success notification on success`, async () => {
        const store = useProjectStore()
        const newProject = { name: `New Project`, description: `A new project` }
        const createdProject = { ...newProject, id: `3`, createdAt: new Date().toISOString(), taskCount: 0 }
        vi.mocked(projectApiService.createProject).mockResolvedValue(ApiCallResult.Success(createdProject))

        await store.addProject(newProject)

        expect(projectApiService.createProject).toHaveBeenCalledWith(newProject)
        expect(notificationHelper.showSuccessNotification).toHaveBeenCalledWith(NotificationMessages.CREATED)
      })

      it(`should show an error notification on failure`, async () => {
        const store = useProjectStore()
        const newProject = { name: `New Project`, description: `A new project` }
        const error = new Error(`Failed to create`)
        vi.mocked(projectApiService.createProject).mockResolvedValue(ApiCallResult.Fail(error))

        await store.addProject(newProject)

        expect(projectApiService.createProject).toHaveBeenCalledWith(newProject)
        expect(notificationHelper.showErrorNotification).toHaveBeenCalledWith(error, NotificationMessages.SAVE_FAILED)
      })
    })

    describe(`updateProject`, () => {
      it(`should call updateProject and show success notification on success`, async () => {
        const store = useProjectStore()
        const updates = { name: `Updated Project` }
        const updatedProject = { ...mockProjects[0], ...updates } as Project
        vi.mocked(projectApiService.updateProject).mockResolvedValue(ApiCallResult.Success(updatedProject))

        const projectId = mockProjects[0]?.id ?? ``

        await store.updateProject(projectId, updates)

        expect(projectApiService.updateProject).toHaveBeenCalledWith(projectId, updates)
        expect(notificationHelper.showSuccessNotification).toHaveBeenCalledWith(NotificationMessages.UPDATED)
      })

      it(`should show an error notification on failure`, async () => {
        const store = useProjectStore()
        const updates = { name: `Updated Project` }
        const error = new Error(`Failed to update`)
        vi.mocked(projectApiService.updateProject).mockResolvedValue(ApiCallResult.Fail(error))

        const projectId = mockProjects[0]?.id ?? ``

        await store.updateProject(projectId, updates)

        expect(projectApiService.updateProject).toHaveBeenCalledWith(projectId, updates)
        expect(notificationHelper.showErrorNotification).toHaveBeenCalledWith(error, NotificationMessages.SAVE_FAILED)
      })
    })

    describe(`deleteProject`, () => {
      it(`should call deleteProject and show success notification on success`, async () => {
        const store = useProjectStore()
        vi.mocked(projectApiService.deleteProject).mockResolvedValue(ApiCallResult.SuccessVoid())

        const projectId = mockProjects[0]?.id ?? ``

        await store.deleteProject(projectId)

        expect(projectApiService.deleteProject).toHaveBeenCalledWith(projectId)
        expect(notificationHelper.showSuccessNotification).toHaveBeenCalledWith(NotificationMessages.DELETED)
      })

      it(`should show an error notification on failure`, async () => {
        const store = useProjectStore()
        const error = new Error(`Failed to delete`)
        vi.mocked(projectApiService.deleteProject).mockResolvedValue(ApiCallResult.Fail(error))

        const projectId = mockProjects[0]?.id ?? ``

        await store.deleteProject(projectId)

        expect(projectApiService.deleteProject).toHaveBeenCalledWith(projectId)
        expect(notificationHelper.showErrorNotification).toHaveBeenCalledWith(error, NotificationMessages.DELETE_FAILED)
      })
    })
  })
})
