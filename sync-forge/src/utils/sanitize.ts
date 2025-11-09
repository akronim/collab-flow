export function sanitizeInput(input: string): string {
    const div = document.createElement('div')
    div.textContent = input
    return div.innerHTML
}

// usage
/*
<input v-model="sanitizedTitle" />
<script setup>
const sanitizedTitle = computed({
  get: () => sanitizeInput(rawTitle.value),
  set: (v) => rawTitle.value = v
})
</script>
*/