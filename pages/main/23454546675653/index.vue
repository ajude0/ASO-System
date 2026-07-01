<template>
  <div class="bg-white border border-slate-200 rounded-2xl p-7 font-sans text-slate-900 w-full relative">

    <!-- Header -->
    <div class="flex flex-wrap justify-between items-start gap-3 mb-5">
      <div>
        <span class="block text-[11px] font-semibold tracking-widest uppercase text-slate-400 mb-1">
          System Analytics
        </span>
        <h2 class="text-xl font-bold tracking-tight text-slate-900 m-0">
          Digifast Utilization
        </h2>
      </div>
      <div class="flex gap-6">
        <div v-if="summary.totalTransactions" class="text-right">
          <span class="block text-[22px] font-bold tracking-tighter text-slate-900">
            {{ formatNumber(summary.totalTransactions) }}
          </span>
          <span class="block text-[11px] text-slate-400 mt-0.5">Total Transactions</span>
        </div>
        <div v-if="summary.peakUsers" class="text-right">
          <span class="block text-[22px] font-bold tracking-tighter text-slate-900">
            {{ summary.peakUsers }}
          </span>
          <span class="block text-[11px] text-slate-400 mt-0.5">Peak Active Users</span>
        </div>
      </div>
    </div>

    <!-- Date Presets + Filter Row -->
    <div class="flex flex-wrap items-center gap-1.5 mb-4">

      <!-- Preset Pills -->
      <button
        v-for="p in presets"
        :key="p.key"
        @click="applyPreset(p.key)"
        :class="[
          'text-[12px] px-3 py-1 rounded-full border transition-all duration-150 cursor-pointer',
          activePreset === p.key
            ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium'
            : 'border-slate-200 bg-slate-50 text-slate-500 hover:text-slate-800 hover:border-slate-300'
        ]"
      >
        {{ p.label }}
      </button>

      <div class="w-px h-4 bg-slate-200 mx-1"></div>

      <!-- Custom date inputs -->
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-400">From</label>
        <input
          type="date"
          v-model="startDate"
          @change="activePreset = null"
          class="text-[12px] px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-slate-400">To</label>
        <input
          type="date"
          v-model="endDate"
          @change="activePreset = null"
          class="text-[12px] px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-300"
        />
      </div>
      <button
        @click="fetchData"
        class="text-[12px] px-3 py-1 rounded-lg border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 cursor-pointer transition-colors"
      >
        Apply
      </button>

    </div>

    <!-- Metric Toggle -->
    <div class="flex gap-2 mb-5">
      <button
        v-for="metric in metrics"
        :key="metric.key"
        @click="activeMetric = metric.key"
        :class="[
          'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[13px] font-medium transition-all duration-150 cursor-pointer',
          activeMetric === metric.key
            ? 'bg-slate-100 border-slate-300 text-slate-900'
            : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-900 bg-transparent'
        ]"
      >
        <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ background: metric.color }"></span>
        {{ metric.label }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 min-h-[200px] text-slate-400 text-sm">
      <div class="w-7 h-7 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin"></div>
      <p>Loading utilization data…</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex flex-col items-center justify-center gap-3 min-h-[200px] text-red-500 text-sm">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 6v5M10 14v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <p>{{ error }}</p>
      <button
        @click="fetchData"
        class="mt-1 px-4 py-1.5 rounded-lg border border-red-300 text-red-500 text-[13px] bg-transparent hover:bg-red-50 transition-colors cursor-pointer"
      >
        Retry
      </button>
    </div>

    <!-- Chart -->
    <div v-else-if="chartData.length" class="relative">
      <svg
        ref="svgRef"
        :viewBox="`0 0 ${svgW} ${svgH}`"
        class="w-full h-auto block overflow-visible"
        @mousemove="onMouseMove"
        @mouseleave="tooltip.visible = false"
      >
        <defs>
          <linearGradient :id="`grad-${activeMetric}`" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="activeColor" stop-opacity="0.15"/>
            <stop offset="100%" :stop-color="activeColor" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- Grid lines -->
        <line
          v-for="(tick, i) in yTicks" :key="`g${i}`"
          :x1="pad.l" :y1="yScale(tick)"
          :x2="svgW - pad.r" :y2="yScale(tick)"
          stroke="#f1f5f9" stroke-width="1"
        />

        <!-- Y-axis labels -->
        <text
          v-for="(tick, i) in yTicks" :key="`y${i}`"
          :x="pad.l - 10" :y="yScale(tick) + 4"
          text-anchor="end"
          style="font-size:11px; fill:#94a3b8; font-family:inherit"
        >{{ formatTick(tick) }}</text>

        <!-- X-axis labels -->
        <text
          v-for="(d, i) in xLabelPoints" :key="`x${i}`"
          :x="xScale(i * xLabelStep)" :y="svgH - pad.b + 18"
          text-anchor="middle"
          style="font-size:11px; fill:#94a3b8; font-family:inherit"
        >{{ formatDate(d.date) }}</text>

        <!-- Area fill -->
        <path :d="areaPath" :fill="`url(#grad-${activeMetric})`" />

        <!-- Line -->
        <path
          :d="linePath"
          :stroke="activeColor"
          stroke-width="2.5"
          fill="none"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- Dots -->
        <circle
          v-for="(d, i) in chartData" :key="`dot${i}`"
          :cx="xScale(i)" :cy="yScale(activeValue(d))"
          r="3.5" :fill="activeColor"
          :opacity="tooltip.visible ? 0.7 : 0"
          style="transition: opacity 0.15s"
        />

        <!-- Crosshair + active dot -->
        <g v-if="tooltip.visible && tooltip.index >= 0">
          <line
            :x1="xScale(tooltip.index)" :y1="pad.t"
            :x2="xScale(tooltip.index)" :y2="svgH - pad.b"
            stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 3"
          />
          <circle
            :cx="xScale(tooltip.index)"
            :cy="yScale(activeValue(chartData[tooltip.index]))"
            r="5.5" :fill="activeColor"
            stroke="white" stroke-width="2"
          />
        </g>
      </svg>

      <!-- Tooltip -->
      <div
        v-if="tooltip.visible && tooltip.data"
        class="absolute pointer-events-none z-10 bg-white border border-slate-200 rounded-xl px-4 py-3 min-w-[180px] shadow-md"
        :style="tooltipStyle"
      >
        <div class="text-[11px] font-semibold text-slate-400 tracking-wide mb-2">
          {{ formatDateFull(tooltip.data.date) }}
        </div>
        <div class="flex items-center gap-2 py-0.5">
          <span class="w-[7px] h-[7px] rounded-full flex-shrink-0" :style="{ background: metrics[0].color }"></span>
          <span class="flex-1 text-xs text-slate-400">Active Users</span>
          <span class="text-[13px] font-bold text-slate-900">{{ tooltip.data.activeUsers }}</span>
        </div>
        <div class="flex items-center gap-2 py-0.5">
          <span class="w-[7px] h-[7px] rounded-full flex-shrink-0" :style="{ background: metrics[1].color }"></span>
          <span class="flex-1 text-xs text-slate-400">Transactions</span>
          <span class="text-[13px] font-bold text-slate-900">{{ formatNumber(tooltip.data.totalTransactions) }}</span>
        </div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else class="flex items-center justify-center min-h-[200px] text-slate-400 text-sm">
      No utilization data available.
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE_URL } from '~/config'

const API_URL = `${API_BASE_URL}/api/Dashboard/digifast-utilization`

const metrics = [
  { key: 'activeUsers',       label: 'Active Users', color: '#6366f1' },
  { key: 'totalTransactions', label: 'Transactions', color: '#10b981' },
]

// ── Presets ───────────────────────────────────────────────────────────────
const presets = [
  { key: 'last_30days',  label: 'Last 30 days' },  // ← renamed
  { key: 'this_week',    label: 'This week' },
  { key: 'last_week',    label: 'Last week' },
  { key: 'this_month',   label: 'This month' },
  { key: 'last_month',   label: 'Last month' },
  { key: 'last_3months', label: 'Last 3 months' },
]

const activePreset = ref('this_month')

function toInputDate(d) {
  return d.toISOString().slice(0, 10)
}

function applyPreset(key) {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = now.getMonth()

  const ranges = {
    last_30days: () => {
    const start = new Date(now)
    start.setDate(now.getDate() - 29)
    return [start, now]
  },
    this_week: () => {
      const day = now.getDay() || 7
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return [mon, sun]
    },
    last_week: () => {
      const day = now.getDay() || 7
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1 - 7)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return [mon, sun]
    },
    this_month:   () => [new Date(y, m, 1),     new Date(y, m + 1, 0)],
    last_month:   () => [new Date(y, m - 1, 1), new Date(y, m, 0)],
    last_3months: () => [new Date(y, m - 2, 1), new Date(y, m + 1, 0)],
  }

  const [s, e]       = ranges[key]()
  startDate.value    = toInputDate(s)
  endDate.value      = toInputDate(e)
  activePreset.value = key
  fetchData()
}
// ─────────────────────────────────────────────────────────────────────────

// ── Date filter state ─────────────────────────────────────────────────────
const now          = new Date()
const startDate    = ref(toInputDate(new Date(now.getFullYear(), now.getMonth(), 1)))
const endDate      = ref(toInputDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)))
// ─────────────────────────────────────────────────────────────────────────

const loading      = ref(true)
const error        = ref(null)
const rawData      = ref([])
const activeMetric = ref('activeUsers')
const svgRef       = ref(null)
const tooltip      = ref({ visible: false, index: -1, data: null, x: 0, y: 0 })

const svgW = 800
const svgH = 320
const pad  = { t: 20, r: 20, b: 38, l: 48 }

const chartData   = computed(() => rawData.value)
const activeColor = computed(() => metrics.find(m => m.key === activeMetric.value)?.color ?? '#6366f1')
const activeValue = (d) => activeMetric.value === 'activeUsers' ? d.activeUsers : d.totalTransactions

const summary = computed(() => ({
  totalTransactions: rawData.value.reduce((s, d) => s + d.totalTransactions, 0),
  peakUsers: Math.max(0, ...rawData.value.map(d => d.activeUsers)),
}))

const yMax = computed(() => Math.max(1, ...chartData.value.map(d => activeValue(d))))

const yTicks = computed(() => {
  const step = niceStep(yMax.value / 4)
  const ticks = []
  for (let v = 0; v <= yMax.value + step; v += step) ticks.push(v)
  return ticks
})

function xScale(i) {
  const n = chartData.value.length
  if (n <= 1) return pad.l
  return pad.l + (i / (n - 1)) * (svgW - pad.l - pad.r)
}
function yScale(v) {
  const top = yTicks.value[yTicks.value.length - 1]
  return pad.t + (1 - v / top) * (svgH - pad.t - pad.b)
}

const linePath = computed(() =>
  chartData.value.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(activeValue(d))}`).join(' ')
)
const areaPath = computed(() => {
  if (!chartData.value.length) return ''
  const last = chartData.value.length - 1
  return `${linePath.value} L${xScale(last)},${yScale(0)} L${xScale(0)},${yScale(0)} Z`
})

const xLabelStep   = computed(() => Math.max(1, Math.ceil(chartData.value.length / 8)))
const xLabelPoints = computed(() => {
  const out = []
  for (let i = 0; i < chartData.value.length; i += xLabelStep.value) out.push(chartData.value[i])
  return out
})

const tooltipStyle = computed(() => {
  const flipX = tooltip.value.x > svgW * 0.65
  return {
    left:  flipX ? 'auto' : `${tooltip.value.x + 14}px`,
    right: flipX ? `${svgW - tooltip.value.x + 14}px` : 'auto',
    top:   `${Math.max(0, tooltip.value.y - 10)}px`,
  }
})

async function fetchData() {
  loading.value = true
  error.value   = null
  try {
    const params = new URLSearchParams()
    if (startDate.value) params.append('startDate', startDate.value)
    if (endDate.value)   params.append('endDate',   endDate.value)
    const res = await fetch(`${API_URL}?${params.toString()}`)
    if (!res.ok) throw new Error(`Server error ${res.status}`)
    rawData.value = await res.json()
  } catch (e) {
    error.value = e.message || 'Failed to load data.'
  } finally {
    loading.value = false
  }
}

onMounted(() => applyPreset('last_30days'))

function onMouseMove(e) {
  if (!svgRef.value || !chartData.value.length) return
  const rect = svgRef.value.getBoundingClientRect()
  const mx   = (e.clientX - rect.left) * (svgW / rect.width)
  const my   = (e.clientY - rect.top)  * (svgH / rect.height)
  const l = pad.l, r = svgW - pad.r
  if (mx < l || mx > r) { tooltip.value.visible = false; return }
  const idx = Math.round(((mx - l) / (r - l)) * (chartData.value.length - 1))
  tooltip.value = { visible: true, index: idx, data: chartData.value[idx], x: xScale(idx), y: my }
}

function niceStep(raw) {
  const exp = Math.pow(10, Math.floor(Math.log10(raw)))
  const f   = raw / exp
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * exp
}
function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
function formatTick(n)       { return formatNumber(n) }
function formatDate(iso)     { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function formatDateFull(iso) { return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) }

definePageMeta({
  middleware: ["auth", "check-menu-access"],
  name: "23454546675653",
})
</script>