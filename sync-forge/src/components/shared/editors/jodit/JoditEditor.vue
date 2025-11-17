<template>
  <div>
    <textarea
      ref="joditTextarea"
      :value="editorModel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import type { IJodit, DeepPartial } from 'jodit/esm/types'
import type { Config } from 'jodit/esm/config'
import { loadAce, loadJodit } from './joditLoader'
import { html_beautify } from 'js-beautify'

const editorModel = defineModel("editorModel", { required: true, type: String })

const props = defineProps<{
  readonly?: boolean,
  config?: DeepPartial<Config>,
  name?: string
  height?: string | number | undefined
}>()

const joditTextarea = ref<HTMLTextAreaElement | null>(null)
const joditInstance = ref<IJodit | null>()

const updateEditorModel = (newValue: string): void => {
  editorModel.value = newValue
}

const config: DeepPartial<Config> = {
  readonly: props.readonly ?? false,
  height: props.height,
  ...props.config
}

const initEditor = async (): Promise<void> => {
  if (joditTextarea.value) {
    const { Jodit } = await loadJodit()

    if (config?.buttons?.includes(`source`) && !config.disablePlugins?.includes(`source`)) {
      await loadAce()
    }

    window.html_beautify = html_beautify

    joditInstance.value = Jodit.make(joditTextarea.value, config)

    joditInstance.value.setEditorValue(editorModel.value)
    joditInstance.value.events.on(`change`, updateEditorModel)
  }
}

onMounted(async () => {
  await initEditor()
})

onBeforeUnmount(() => {
  if (joditInstance.value) {
    joditInstance.value.events.off(`change`, updateEditorModel)
    joditInstance.value.destruct()
    joditInstance.value = null
  }
})

defineExpose({ editorModel, joditInstance, updateEditorModel })
</script>
