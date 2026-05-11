<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'

const draggable = defineAsyncComponent(() => import('vuedraggable'))

const STATIC_POOL = [
  { name: 'SANTOS, Maria Luz',   emplId: 'EMP001', color: '#303030' },
  { name: 'REYES, Juan Carlo',   emplId: 'EMP002', color: '#10b981' },
  { name: 'DELA CRUZ, Ana Mae',  emplId: 'EMP003', color: '#f59e0b' },
  { name: 'GARCIA, Pedro Jose',  emplId: 'EMP004', color: '#ef4444' },
  { name: 'LARA, Elena Grace',   emplId: 'EMP005', color: '#8b5cf6' },
  { name: 'MENDOZA, Rico Boy',   emplId: 'EMP006', color: '#3b82f6' },
]

const signers = ref([
  { ...STATIC_POOL[0], approvalOrder: 1 },
  { ...STATIC_POOL[1], approvalOrder: 2 },
  { ...STATIC_POOL[2], approvalOrder: 3 },
])

const enforceSequentialOrder = ref(false)
const nextPoolIndex = ref(3)

const poolExhausted = computed(() => nextPoolIndex.value >= STATIC_POOL.length)

const findSigner = (emplId, name) =>
  signers.value.find(s => (emplId && s.emplId === emplId) || (name && s.name === name))

const getNextApprovalOrder = () =>
  signers.value.length === 0
    ? 1
    : Math.max(...signers.value.map(s => Number(s.approvalOrder || 0))) + 1

const updateApprovalOrderFromList = () => {
  if (!enforceSequentialOrder.value) return
  signers.value.forEach((s, i) => { s.approvalOrder = i + 1 })
}

const onSignersDragEnd = () => {
  updateApprovalOrderFromList()
}

const removeSigner = (index) => {
  signers.value.splice(index, 1)
  updateApprovalOrderFromList()
}

const upsertSigner = ({ name, emplId, color }) => {
  if (!name && !emplId) return null
  let s = findSigner(emplId, name)
  if (!s) {
    s = { name, emplId: emplId || '', color: color || '#303030', approvalOrder: getNextApprovalOrder() }
    signers.value.push(s)
  }
  return s
}

const addFromPool = () => {
  if (poolExhausted.value) return
  const entry = STATIC_POOL[nextPoolIndex.value]
  upsertSigner(entry)
  nextPoolIndex.value++
}

const onSeqChange = () => {
  if (enforceSequentialOrder.value) {
    signers.value.forEach((s, i) => { s.approvalOrder = i + 1 })
  }
}

const saveSignatures = () => {
  if (signers.value.length === 0) return
  const payload = signers.value.map(s => ({
    name:          s.name,
    emplId:        s.emplId,
    color:         s.color,
    approvalOrder: Number(s.approvalOrder || 1),
    enforceSequentialOrder: enforceSequentialOrder.value,
    freeSign: true,
  }))
  // Emit or handle payload as needed
  console.log('saveSignatures payload:', payload)
}

const reset = () => {
  signers.value = [
    { ...STATIC_POOL[0], approvalOrder: 1 },
    { ...STATIC_POOL[1], approvalOrder: 2 },
    { ...STATIC_POOL[2], approvalOrder: 3 },
  ]
  nextPoolIndex.value = 3
  enforceSequentialOrder.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 flex items-start justify-center py-10 px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">

      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-200">
        <h2 class="text-base font-bold text-gray-900">Select Signers</h2>
        <p class="text-xs text-gray-400 mt-0.5">
          Drag <span class="font-bold">⠿</span> to reorder · toggle sequential to number them
        </p>
      </div>

      <!-- Body -->
      <div class="px-6 py-5 flex flex-col gap-4">

        <!-- Sequential toggle -->
        <div class="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div class="flex items-center gap-2.5">
            <input
              id="seq"
              type="checkbox"
              v-model="enforceSequentialOrder"
              @change="onSeqChange"
              class="w-4 h-4 rounded accent-blue-600 cursor-pointer"
            />
            <label for="seq" class="text-sm font-semibold text-gray-700 cursor-pointer">
              Enforce Sequential Signing Order
            </label>
          </div>
          <span
            v-if="enforceSequentialOrder"
            class="text-xs font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full tracking-wide"
          >ON</span>
        </div>

        <!-- Add signer button -->
        <button
          class="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 font-semibold text-sm hover:bg-blue-50 hover:border-blue-400 transition disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="poolExhausted"
          @click="addFromPool"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-width="2" stroke-linecap="round" d="M12 4v16m8-8H4" />
          </svg>
          {{ poolExhausted ? 'All directory members added' : 'Add Signer from Directory' }}
        </button>

        <!-- Signers list label -->
        <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest -mb-2">
          Signers — {{ signers.length }}
        </p>

        <!-- Draggable list -->
   
          <draggable
            v-if="signers.length > 0"
            v-model="signers"
            item-key="emplId"
            handle=".drag-handle"
            ghost-class="opacity-30"
            chosen-class="shadow-xl"
            @end="onSignersDragEnd"
            class="flex flex-col gap-2"
          >
            <template #item="{ element: s, index }">
              <div
                class="flex items-center gap-3 bg-white border-2 rounded-xl px-3 py-3 shadow-sm hover:shadow-md transition"
                :style="{ borderColor: s.color }"
              >
                <!-- Drag handle -->
                <span
                  class="drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 text-lg leading-none select-none px-0.5"
                  title="Drag to reorder"
                >⠿</span>

                <!-- Order badge OR color dot -->
                <span
                  v-if="enforceSequentialOrder"
                  class="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-sm"
                  :style="{ backgroundColor: s.color }"
                >{{ s.approvalOrder }}</span>
                <span
                  v-else
                  class="flex-shrink-0 w-3 h-3 rounded-full border border-white shadow-sm"
                  :style="{ backgroundColor: s.color }"
                />

                <!-- Name -->
                <span class="flex-1 font-semibold text-gray-800 text-sm truncate">{{ s.name }}</span>

                <!-- Employee ID -->
                <span class="text-xs text-gray-400 font-mono flex-shrink-0">{{ s.emplId }}</span>

                <!-- Remove button -->
                <button
                  class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Remove signer"
                  @click="removeSigner(index)"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-width="2" stroke-linecap="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </template>
          </draggable>

          <!-- Empty state -->
          <div
            v-if="signers.length === 0"
            class="flex flex-col items-center justify-center py-10 text-gray-300 border-2 border-dashed border-gray-200 rounded-xl"
          >
            <svg class="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-width="1.2"
                d="M17 20h5v-2a4 4 0 00-5.356-3.712M9 20H4v-2a4 4 0 015.356-3.712M15 7a4 4 0 11-8 0 4 4 0 018 0zm6 3a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p class="text-sm font-medium text-gray-400">No signers added yet.</p>
            <p class="text-xs text-gray-300 mt-1">Click "Add Signer" above to get started.</p>
          </div>

          


      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
        <span class="text-xs text-gray-400">
          {{ signers.length }} signer{{ signers.length !== 1 ? 's' : '' }} selected
        </span>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition font-medium"
            @click="reset"
          >Reset</button>
          <button
            class="px-5 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="signers.length === 0"
            @click="saveSignatures"
          >Save</button>
        </div>
      </div>

    </div>
  </div>
</template>
 