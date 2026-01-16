    <script setup lang="ts">
    import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
    import type { MetricPayload } from '@/store/metrics'

    type Props = {
    data: MetricPayload[]
    field: keyof MetricPayload
    label: string
    valueFormat?: (v: number) => string
    }
    const props = defineProps<Props>()

    const el = ref<HTMLCanvasElement | null>(null)
    let raf = 0

    const values = computed<number[]>(() =>
    (props.data || [])
        .map(d => Number(d[props.field]))
        .filter(v => Number.isFinite(v))
    )

    function draw() {
    raf = requestAnimationFrame(draw)
    const canvas = el.value
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // size for device pixel ratio
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2)
    const width = canvas.clientWidth || 300
    const height = canvas.clientHeight || 64
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr)
        canvas.height = Math.floor(height * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    // guard
    const arr = values.value
    if (!arr.length) {
        ctx.fillStyle = '#8a8a8a'
        ctx.fillText(props.label, 8, 16)
        return
    }

    // compute min/max
    let min = Math.min(...arr)
    let max = Math.max(...arr)
    if (min === max) { min -= 1; max += 1 }

    // axes-free sparkline
    const pad = 6
    const w = width - pad * 2
    const h = height - pad * 2

    ctx.lineWidth = 2
    ctx.strokeStyle = '#4f46e5'
    ctx.beginPath()

    for (let i = 0; i < arr.length; i++) {
        const t = i / Math.max(1, arr.length - 1)
        const x = pad + t * w
        const value = arr[i] ?? 0
        const y = pad + (1 - (value - min) / (max - min)) * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // label + latest value
    const last = arr[arr.length - 1]
    const formatted = last !== undefined && props.valueFormat ? props.valueFormat(last) : String(last?.toFixed?.(1) ?? last ?? 0)
    ctx.fillStyle = '#111827'
    ctx.fillText(`${props.label} (${formatted})`, 8, 16)
    }

    onMounted(() => { draw() })
    onBeforeUnmount(() => cancelAnimationFrame(raf))
    </script>

    <template>
    <div style="height:72px; width:100%; border:1px solid #e5e7eb; border-radius:12px; padding:6px; overflow:hidden;">
        <canvas ref="el" style="width:100%; height:100%; display:block;"></canvas>
    </div>
    </template>
