<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import * as THREE from 'three'
import { useMetricsStore } from '@/store/metrics'
import { flowToRGB } from '@/utils/colorMap'

type Mode = 'FLOW' | 'LATENCY' | 'ALERTS'
const props = withDefaults(defineProps<{ mode?: Mode }>(), { mode: 'FLOW' })

const hostRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const store = useMetricsStore()

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let mesh: THREE.Mesh | null = null
let raf = 0
let ro: ResizeObserver | null = null

function sizeFromHost() {
  if (!renderer || !camera || !hostRef.value) return
  const rect = hostRef.value.getBoundingClientRect()
  const width = Math.max(320, Math.floor(rect.width || 800))
  const height = Math.max(300, Math.floor(rect.height || 420))
  renderer.setSize(width, height, true)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function createScene(canvas: HTMLCanvasElement) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 2))

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#0b1220')

  camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100)
  camera.position.set(0, 0.5, 2)

  const dir = new THREE.DirectionalLight(0xffffff, 1.1)
  dir.position.set(1, 1, 2)
  scene.add(dir)
  scene.add(new THREE.AmbientLight(0xffffff, 0.25))

  const geo = new THREE.TorusKnotGeometry(0.35, 0.12, 256, 32)
  const mat = new THREE.MeshStandardMaterial({ color: 0x0088ff, metalness: 0.1, roughness: 0.6 })
  mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)

  sizeFromHost()
  animate()
}

// normalize metrics → 0..1 scalar depending on selected mode
function clamp01(x: number) { return Math.max(0, Math.min(1, x)) }
const scalar = computed(() => {
  const m = store.lastAggregate
  if (!m) return 0.25
  switch (props.mode) {
    case 'FLOW':
      return clamp01(m.flowIndex)                // already 0..1
    case 'LATENCY': {
      // assume typical p99 20..200ms → map to 0..1 (tweak as you like)
      const ms = Math.max(0, m.latencyMs)
      return clamp01(ms / 200)
    }
    case 'ALERTS':
      return clamp01(m.alertRate)                // 0..1
    default:
      return 0.25
  }
})

function animate() {
  raf = requestAnimationFrame(animate)
  if (mesh && scene && camera && renderer) {
    mesh.rotation.y += 0.003
    mesh.rotation.x += 0.001
    const [r, g, b] = flowToRGB(scalar.value)    // apply gradient color
    ;(mesh.material as THREE.MeshStandardMaterial).color.setRGB(r, g, b)
    renderer.render(scene, camera)
  }
}

onMounted(() => {
  const canvas = canvasRef.value!
  createScene(canvas)
  ro = new ResizeObserver(sizeFromHost)
  if (hostRef.value) ro.observe(hostRef.value)
  window.addEventListener('resize', sizeFromHost)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', sizeFromHost)
  ro?.disconnect()
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  mesh = null
})
</script>

<template>
  <div
    ref="hostRef"
    style="height: 420px; width: 100%; position: relative; border-radius: 16px; background: #0b1220; overflow: hidden;"
  >
    <canvas ref="canvasRef" style="display:block; width:100%; height:100%;"></canvas>

    <!-- legend badge -->
    <div
      style="position:absolute; left:12px; bottom:12px; font-size:12px; color:#fff; opacity:.9; background:#0008; padding:6px 10px; border-radius:6px; display:flex; align-items:center; gap:8px;"
    >
      <span style="font-weight:600;">3D Panel</span>
      <span style="opacity:.8;">• Color by:</span>
      <span style="font-weight:600;">{{ props.mode }}</span>
      <span style="width:160px; height:8px; border-radius:6px; overflow:hidden; border:1px solid #ffffff22; display:inline-block;">
        <span style="display:block; width:100%; height:100%; background:linear-gradient(90deg,#00b3ff 0%,#ffe000 50%,#ff0033 100%);"></span>
      </span>
      <span style="opacity:.8;">low</span><span style="opacity:.8;">→</span><span style="opacity:.8;">high</span>
    </div>
  </div>
</template>
