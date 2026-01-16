<script setup lang="ts">
import ScenarioSwitch from '@/components/ScenarioSwitch.vue'
</script>

<template>
  <header class="border-b bg-white">
    <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
      <h1 class="text-xl font-bold">Insight360</h1>
      <ScenarioSwitch />
    </div>
  </header>
  <router-view />
</template>
