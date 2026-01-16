<script setup lang="ts">
import { ref, watch } from 'vue'
import { send } from '@/services/ws'

const mode = ref<'NORMAL'|'CONGESTION'|'OUTAGE'|'FLAP'>('NORMAL')
const connected = ref(false)
watch(mode, (m) => send({ mode: m }))
</script>

<!-- C:\Users\jashw\Desktop\insight360\src\components\ScenarioSwitch.vue -->
<template>
  <div class="flex items-center gap-2 text-sm">
    <span class="text-gray-600">Scenario:</span>
    <select class="border rounded px-2 py-1">
        
      <option>NORMAL</option>
      <option>CONGESTION</option>
      <option>OUTAGE</option>
      <option>FLAP</option>
    </select>
    
  </div>
  <div class="flex items-center gap-2 text-sm">
 


  <span
    :class="['w-2.5 h-2.5 rounded-full', connected ? 'bg-green-500' : 'bg-red-500']"
    title="WebSocket Connection"
  ></span>
</div>

</template>

