<script setup lang="ts">
defineProps<{ label: string; value: string; foot?: string }>();
</script>

<template>
  <div class="rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-4">
    <div class="text-xs text-gray-500">{{ label }}</div>
    <div class="text-2xl font-semibold tracking-tight mt-1">{{ value }}</div>
    <div v-if="foot" class="text-xs text-gray-400 mt-1">{{ foot }}</div>
  </div>
</template>
