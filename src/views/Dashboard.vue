<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useMetricsStore, type MetricPayload } from '@/store/metrics'
import { bus, connect, disconnect } from '@/services/ws'

import MetricCard from '@/components/MetricCard.vue'
import ThreePanel from '@/components/ThreePanel.vue'
import CanvasLineChart from '@/components/CanvasLineChart.vue'
import ColorBySwitch from '@/components/ColorBySwitch.vue'

const store = useMetricsStore()

// color mode for 3D
const mode = ref<'FLOW' | 'LATENCY' | 'ALERTS'>('FLOW')

// KPIs (use multi-node aggregate from the store)
const last = computed(() => store.lastAggregate)
const lastTimeText = computed(() => (last.value ? new Date(last.value.ts).toLocaleTimeString() : ''))

// connection status (optional)
const status = ref<'connecting' | 'open' | 'closed' | 'error'>('connecting')

// handlers
const onMetric = (m: MetricPayload) => store.push(m)
const onNodes = (nodes: string[]) => store.setNodes(nodes)
const onOpen = () => (status.value = 'open')
const onClose = () => (status.value = 'closed')
const onError = () => (status.value = 'error')

onMounted(() => {
  connect()
  bus.on('metric', onMetric)
  bus.on('nodes', onNodes)
  bus.on('open', onOpen)
  bus.on('close', onClose)
  bus.on('error', onError)
})

onBeforeUnmount(() => {
  bus.off('metric', onMetric)
  bus.off('nodes', onNodes)
  bus.off('open', onOpen)
  bus.off('close', onClose)
  bus.off('error', onError)
  disconnect()
})
</script>

<template>
  <main class="mx-auto max-w-7xl px-4 py-6 space-y-6">
    <!-- top controls -->
    <section class="flex items-center gap-4">
      <ColorBySwitch v-model="mode" />

      <!-- tiny legend -->
      <div class="flex items-center gap-2 text-xs text-gray-700">
        <div class="w-40 h-2 rounded border border-gray-200 overflow-hidden">
          <div class="w-full h-full" style="background:linear-gradient(90deg,#00b3ff 0%,#ffe000 50%,#ff0033 100%);"></div>
        </div>
        <span class="opacity-70">low</span><span class="opacity-50">→</span><span class="opacity-70">high</span>

        <!-- connection dot -->
        <span
          class="ml-3 inline-block w-2.5 h-2.5 rounded-full"
          :class="{
            'bg-green-500': status === 'open',
            'bg-yellow-500': status === 'connecting',
            'bg-red-500': status === 'closed' || status === 'error'
          }"
          :title="`WebSocket: ${status}`"
        />
      </div>
    </section>

    <!-- connection banner (optional) -->
    <div
      v-if="status !== 'open'"
      class="rounded-md border px-3 py-2 text-sm"
      :class="{
        'bg-yellow-50 border-yellow-200 text-yellow-800': status === 'connecting' || status === 'closed',
        'bg-red-50 border-red-200 text-red-800': status === 'error'
      }"
    >
      <span v-if="status === 'connecting'">Connecting to live telemetry…</span>
      <span v-else-if="status === 'closed'">Disconnected. Reconnecting…</span>
      <span v-else-if="status === 'error'">Connection error. Retrying…</span>
    </div>

    <!-- KPIs (aggregate across nodes) -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard label="Throughput" :value="last ? `${last.throughput.toFixed(1)} Mbps` : '--'" :foot="lastTimeText" />
      <MetricCard label="Latency (p99)" :value="last ? `${last.latencyMs.toFixed(0)} ms` : '--'" />
      <MetricCard label="Alert Rate" :value="last ? `${(last.alertRate * 100).toFixed(1)}%` : '--'" />
    </section>

    <!-- Trends (use flattened history so your existing chart works unchanged) -->
    <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <CanvasLineChart
        :data="store.historyFlat"
        field="throughput"
        label="Throughput (Mbps)"
        :valueFormat="v => `${v.toFixed(1)} Mbps`"
      />
      <CanvasLineChart
        :data="store.historyFlat"
        field="latencyMs"
        label="Latency p99 (ms)"
        :valueFormat="v => `${v.toFixed(0)} ms`"
      />
      <CanvasLineChart
        :data="store.historyFlat"
        field="alertRate"
        label="Alert Rate (%)"
        :valueFormat="v => `${(v * 100).toFixed(1)}%`"
      />
    </section>

    <!-- 3D -->
    <section class="grid grid-cols-1 gap-4">
      <ThreePanel :mode="mode" />
    </section>
  </main>
</template>
