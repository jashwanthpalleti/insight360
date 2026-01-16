<!-- src/components/ColorBySwitch.vue -->
<script setup lang="ts">
import { ref, watch, toRefs } from 'vue'

type Mode = 'FLOW' | 'LATENCY' | 'ALERTS'
const props = defineProps<{ modelValue: Mode }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Mode): void }>()

const { modelValue } = toRefs(props)
const local = ref<Mode>(modelValue?.value ?? 'FLOW')

watch(modelValue, v => (local.value = (v ?? 'FLOW') as Mode))
watch(local, v => emit('update:modelValue', v))
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <span class="text-gray-600">Color by:</span>
    <select v-model="local" class="border rounded px-2 py-1">
      <option value="FLOW">Flow</option>
      <option value="LATENCY">Latency</option>
      <option value="ALERTS">Alerts</option>
    </select>
  </div>
</template>
