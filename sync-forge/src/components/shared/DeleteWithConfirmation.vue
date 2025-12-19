<template>
  <div class="w-16 flex justify-center">
    <!-- v-tooltip.top="{ value: tooltipTxt }" -->
    <SfButton
      v-if="itemCodeToRemove !== itemCode"
      
      :data-testid="`delete-confirm-button-${itemCode}`"
      variant="danger"
      size="sm"
      @click.stop="requireConfirmation"
    >
      <Trash2 class="w-4 h-4" />
    </SfButton>
    <SfButton
      v-show="itemCodeToRemove === itemCode"
      variant="danger"
      size="sm"
      :data-testid="`delete-button-${itemCode}`"
      @click.stop="deleteItem"
      @mouseleave="onMouseLeave"
    >
      Sure?
    </SfButton>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { SfButton } from '@/components/ui'
import { Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  itemCode: number | string
  disabled?: boolean
  tooltipTxt?: string
}>()

const emit = defineEmits([`delete`])

const itemCodeToRemove = ref<number | string | null>(null)

const requireConfirmation = (): void => {
  itemCodeToRemove.value = props.itemCode
}

const deleteItem = (): void => {
  if (itemCodeToRemove.value === props.itemCode) {
    emit(`delete`, props.itemCode)
  }
  itemCodeToRemove.value = null
}

const onMouseLeave = (): void => {
  itemCodeToRemove.value = null
}

defineExpose({
  itemCodeToRemove,
  requireConfirmation
})
</script>
