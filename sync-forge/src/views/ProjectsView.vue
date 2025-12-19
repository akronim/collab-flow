<template>
  <div class="container mx-auto p-6">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-3xl font-bold text-gray-900">
        Projects
      </h1>
      <SfButton
        data-testid="create-project-button"
        @click="handleCreateProject"
      >
        Create New Project
      </SfButton>
    </div>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <SfCard
        v-for="project in projects"
        :key="project.id"
        hoverable
        clickable
        @click="openBoard(project.id)"
      >
        <template #header>
          <div class="flex items-center justify-between">
            <span class="text-lg font-semibold text-gray-800">
              {{ project.name }}
            </span>
            <div class="flex gap-2">
              <SfButton
                variant="secondary"
                size="sm"
                :data-testid="`edit-project-${project.id}`"
                @click.stop="handleEditProject(project)"
              >
                Edit
              </SfButton>
              <DeleteWithConfirmation
                :item-code="project.id"
                @delete="handleDeleteProject"
              />
            </div>
          </div>
        </template>

        <p class="text-sm text-gray-600">
          {{ project.description || 'No description' }}
        </p>

        <template #footer>
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">
              {{ project.taskCount }} tasks
            </span>
            <SfButton
              variant="outline-blue"
              size="sm"
              @click.stop="openBoard(project.id)"
            >
              Open Board
              <LiExternalLink class="w-4 h-4" />
            </SfButton>
          </div>
        </template>
      </SfCard>
    </div>
    <SfModal
      v-if="isCreateProjectModalOpen"
      title="Create New Project"
      @close="handleModalClose"
    >
      <ProjectForm
        @submit="handleProjectSubmit"
        @cancel="handleModalClose"
      />
    </SfModal>
    <SfModal
      v-if="isEditProjectModalOpen"
      title="Edit Project"
      @close="handleModalClose"
    >
      <ProjectForm
        :project="editingProject"
        @submit="handleProjectUpdate"
        @cancel="handleModalClose"
      />
    </SfModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SfButton, SfCard, SfModal } from '@/components/ui'
import { RouteNames } from '@/constants/routes'
import { useProjectStore } from '@/stores'
import { ExternalLink as LiExternalLink } from 'lucide-vue-next'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ProjectForm from '@/components/projects/ProjectForm.vue'
import type { Project, ProjectFormData } from '@/types/project'
import DeleteWithConfirmation from '@/components/shared/DeleteWithConfirmation.vue'

const projectStore = useProjectStore()

const { projects } = storeToRefs(projectStore)
const router = useRouter()
const isCreateProjectModalOpen = ref(false)
const isEditProjectModalOpen = ref(false)
const editingProject = ref<Project | null>(null)

onMounted(async () => {
  await projectStore.fetchProjects()
})

const openBoard = async (projectId: string): Promise<void> => {
  await router.push({
    name: RouteNames.PROJECT_BOARD,
    params: {
      projectId
    }
  })
}

const handleCreateProject = (): void => {
  isCreateProjectModalOpen.value = true
}

const handleModalClose = (): void => {
  isCreateProjectModalOpen.value = false
  isEditProjectModalOpen.value = false
  editingProject.value = null
}

const handleProjectSubmit = async (data: ProjectFormData): Promise<void> => {
  await projectStore.addProject(data)
  await projectStore.fetchProjects()
  handleModalClose()
}

const handleEditProject = (project: Project): void => {
  editingProject.value = project
  isEditProjectModalOpen.value = true
}

const handleProjectUpdate = async (data: ProjectFormData): Promise<void> => {
  if (editingProject.value) {
    await projectStore.updateProject(editingProject.value.id, data)
    await projectStore.fetchProjects()
    handleModalClose()
  }
}

const handleDeleteProject = async (projectId: string): Promise<void> => {
  await projectStore.deleteProject(projectId)
  await projectStore.fetchProjects()
}
</script>

<style scoped>
.line-clamp-2 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  -webkit-line-clamp: 2;
}
</style>
