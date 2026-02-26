<template>
  <div class="flex flex-col h-screen bg-white text-gray-900 text-sm overflow-hidden">

    <!-- ── Toolbar ── -->
    <header class="flex items-center justify-between px-4 h-13 bg-gray-50 border-b border-gray-200 flex-shrink-0 z-10 gap-3" style="height:52px">

      <!-- Left: Brand + doc name -->
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <div class="flex items-center gap-1.5 font-bold text-base text-violet-400 flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <span>DocSign</span>
        </div>
        <span class="text-xs text-gray-400 truncate">{{ pdfName }}</span>
      </div>

      <!-- Center: Tools + zoom -->
      <div class="flex items-center gap-1 flex-shrink-0">
        <button
          :class="['flex items-center justify-center w-8 h-8 rounded-md border transition-colors',
            activeTool === 'select'
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
              : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-900']"
          title="Select"
          @click="activeTool = 'select'"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-7 2-2 7z"/></svg>
        </button>

        <button
          :class="['flex items-center justify-center w-8 h-8 rounded-md border transition-colors',
            activeTool === 'sign'
              ? 'bg-violet-500/20 border-violet-500/40 text-violet-400'
              : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-100 hover:text-gray-900']"
          title="Place Signature"
          @click="activeTool = 'sign'"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
          </svg>
        </button>

        <div class="w-px h-6 bg-gray-700 mx-1" />

        <button class="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" @click="zoomOut">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <span class="text-xs text-gray-400 w-10 text-center tabular-nums">{{ Math.round(zoom * 100) }}%</span>
        <button class="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors" @click="zoomIn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
      </div>

      <!-- Right: Current user chip + status + Save -->
      <div class="flex items-center gap-2.5 flex-1 justify-end">
        <!-- Current user chip -->
        <div v-if="currentUser" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-300">
          <div class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
            :style="{ background: currentUser.avatarColor ?? '#7c3aed' }">
            {{ initials(currentUser.name) }}
          </div>
          <span class="text-xs text-gray-600 max-w-[120px] truncate">{{ currentUser.name }}</span>
        </div>

        <span
          v-if="activeTool === 'sign'"
          class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-xs font-semibold whitespace-nowrap"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          Signature Mode — Click to Place
        </span>

        <div
          v-if="saveStatus"
          :class="['flex items-center gap-1.5 text-xs font-medium whitespace-nowrap',
            saveStatus === 'saving' ? 'text-amber-400' : 'text-emerald-400']"
        >
          <svg v-if="saveStatus === 'saving'" class="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {{ saveStatus === 'saving' ? 'Saving…' : 'Saved' }}
        </div>

        <button
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
          :disabled="isSaving"
          @click="saveSignatures"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save
        </button>
      </div>
    </header>

    <!-- ── Workspace ── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- ── Side Panel ── -->
      <aside class="w-60 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden flex-shrink-0">

        <!-- Signatures list -->
        <div class="px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200/50 flex-shrink-0">
          Signatures ({{ signatures.length }})
        </div>

        <div class="flex-1 p-2 flex flex-col gap-1 overflow-y-auto min-h-0 bg-gray-50">
          <div
            v-for="sig in signatures"
            :key="sig.id"
            :class="['relative flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all group',
              selectedSigId === sig.id
                ? 'bg-violet-500/10 border-violet-500/30'
                : 'border-transparent hover:bg-gray-100']"
            @click="selectSignature(sig.id)"
          >
            <!-- Thumbnail -->
            <div class="w-9 h-7 bg-white rounded flex items-center justify-center overflow-hidden flex-shrink-0">
              <img v-if="sig.imageSrc" :src="sig.imageSrc" alt="sig" class="w-full h-full object-contain" />
              <span v-else class="text-sm">✍</span>
            </div>
            <!-- Meta -->
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-gray-900 truncate">Sig #{{ sig.id }}</div>
              <div class="text-[10px] text-gray-400">Page {{ sig.page }}</div>
              <div v-if="sig.assignedTo" class="text-[10px] text-violet-400 truncate">{{ sig.assignedTo }}</div>
            </div>
            <!-- Lock icon for other users' sigs -->
            <div v-if="sig.ownerId && sig.ownerId !== currentUserId"
              class="w-4 h-4 flex items-center justify-center text-gray-500 flex-shrink-0" title="Locked — not yours">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <!-- Delete (only own sigs) -->
            <button
              v-if="!sig.ownerId || sig.ownerId === currentUserId"
              class="absolute right-1.5 top-1.5 w-4 h-4 rounded flex items-center justify-center bg-red-900/60 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              @click.stop="removeSignature(sig.id)"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div v-if="signatures.length === 0" class="flex flex-col items-center gap-2 py-8 px-4 text-gray-500 text-center">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.3">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
            <p class="text-xs leading-relaxed">No signatures yet.<br>Switch to the <strong class="text-violet-400">Sign</strong> tool then click the PDF.</p>
          </div>
        </div>

        <!-- Properties panel -->
        <div v-if="selectedSig" class="border-t border-gray-200 flex-shrink-0 overflow-y-auto max-h-72">
          <div class="px-3.5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200/50">
            Properties
          </div>

          <div class="p-2 flex flex-col gap-1.5">
            <!-- Assigned To — user picker -->
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Assigned To</label>
              <div v-if="isOwnedByCurrentUser(selectedSig) || !selectedSig.ownerId">
                <!-- Searchable user dropdown -->
                <div class="relative" ref="dropdownRef">
                  <button
                    type="button"
                    class="w-full flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 border border-gray-300 text-gray-900 text-xs outline-none hover:border-violet-500 focus:border-violet-500 transition-colors text-left"
                    @click="assigneeDropdownOpen = !assigneeDropdownOpen"
                  >
                    <template v-if="selectedAssigneeUser">
                      <div class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                        :style="{ background: selectedAssigneeUser.avatarColor ?? '#7c3aed' }">
                        {{ initials(selectedAssigneeUser.name) }}
                      </div>
                      <span class="flex-1 truncate">{{ selectedAssigneeUser.name }}</span>
                    </template>
                    <span v-else class="flex-1 text-gray-400 truncate">Select user…</span>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                      :class="['transition-transform', assigneeDropdownOpen ? 'rotate-180' : '']">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  <!-- Dropdown list -->
                  <div v-if="assigneeDropdownOpen"
                    class="absolute bottom-full left-0 right-0 mb-1 bg-gray-50 border border-gray-300 rounded-lg shadow-2xl z-50 overflow-hidden">
                    <!-- Search -->
                    <div class="p-1.5 border-b border-gray-200">
                      <input
                        v-model="userSearchQuery"
                        placeholder="Search…"
                        class="w-full px-2 py-1 rounded bg-white border border-gray-200 text-gray-900 text-xs outline-none focus:border-violet-500 transition-colors"
                        @click.stop
                        autofocus
                      />
                    </div>
                    <div class="max-h-40 overflow-y-auto">
                      <!-- Clear option -->
                      <button
                        class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-gray-400 hover:bg-gray-100 transition-colors text-left"
                        @click.stop="assignUser(null)"
                      >
                        <span class="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center flex-shrink-0">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </span>
                        Unassigned
                      </button>
                      <button
                        v-for="u in filteredUsers"
                        :key="u.id"
                        class="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-gray-100 transition-colors text-left"
                        :class="selectedSig.assignedUserId === u.id ? 'bg-violet-500/10 text-violet-300' : 'text-gray-700'"
                        @click.stop="assignUser(u)"
                      >
                        <div class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                          :style="{ background: u.avatarColor ?? '#7c3aed' }">
                          {{ initials(u.name) }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="truncate">{{ u.name }}</div>
                          <div class="text-[9px] text-gray-400 truncate">{{ u.emplId }}</div>
                        </div>
                        <svg v-if="selectedSig.assignedUserId === u.id" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                      <div v-if="filteredUsers.length === 0" class="px-3 py-3 text-xs text-gray-500 text-center">
                        No users found
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Read-only for other users -->
              <div v-else class="flex items-center gap-2 px-2 py-1.5 rounded bg-white/50 border border-gray-200 text-xs text-gray-400">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                {{ selectedSig.assignedTo ?? 'Unassigned' }}
              </div>
            </div>

            <!-- Employee ID — read-only, auto-filled from user -->
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Employee ID</label>
              <div class="px-2 py-1.5 rounded bg-white/50 border border-gray-200 text-xs text-gray-400 truncate">
                {{ selectedSig.assignedEmplId ?? '—' }}
              </div>
            </div>

            <!-- Signed By -->
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Signed By</label>
              <input
                v-if="isOwnedByCurrentUser(selectedSig) || !selectedSig.ownerId"
                v-model="selectedSig.signedBy"
                placeholder="Unsigned"
                class="w-full px-2 py-1.5 rounded bg-gray-50 border border-gray-300 text-gray-900 text-xs outline-none focus:border-violet-500 transition-colors"
              />
              <div v-else class="px-2 py-1.5 rounded bg-white/50 border border-gray-200 text-xs text-gray-400">
                {{ selectedSig.signedBy ?? '—' }}
              </div>
            </div>

            <!-- Signed Date -->
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Signed Date</label>
              <input
                v-if="isOwnedByCurrentUser(selectedSig) || !selectedSig.ownerId"
                v-model="selectedSig.signedDate"
                type="date"
                class="w-full px-2 py-1.5 rounded bg-gray-50 border border-gray-300 text-gray-900 text-xs outline-none focus:border-violet-500 transition-colors"
              />
              <div v-else class="px-2 py-1.5 rounded bg-white/50 border border-gray-200 text-xs text-gray-400">
                {{ selectedSig.signedDate ?? '—' }}
              </div>
            </div>

            <!-- Position -->
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Position (X · Y)</label>
              <div class="flex gap-1.5">
                <input v-model.number="selectedSig.x" type="number" placeholder="X"
                  :disabled="!isOwnedByCurrentUser(selectedSig) && !!selectedSig.ownerId"
                  class="w-1/2 px-2 py-1.5 rounded bg-gray-50 border border-gray-300 text-gray-900 text-xs outline-none focus:border-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" />
                <input v-model.number="selectedSig.y" type="number" placeholder="Y"
                  :disabled="!isOwnedByCurrentUser(selectedSig) && !!selectedSig.ownerId"
                  class="w-1/2 px-2 py-1.5 rounded bg-gray-50 border border-gray-300 text-gray-900 text-xs outline-none focus:border-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" />
              </div>
            </div>

            <!-- Size -->
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Size (W · H)</label>
              <div class="flex gap-1.5">
                <input v-model.number="selectedSig.width" type="number" placeholder="W"
                  :disabled="!isOwnedByCurrentUser(selectedSig) && !!selectedSig.ownerId"
                  class="w-1/2 px-2 py-1.5 rounded bg-gray-50 border border-gray-300 text-gray-900 text-xs outline-none focus:border-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" />
                <input v-model.number="selectedSig.height" type="number" placeholder="H"
                  :disabled="!isOwnedByCurrentUser(selectedSig) && !!selectedSig.ownerId"
                  class="w-1/2 px-2 py-1.5 rounded bg-gray-50 border border-gray-300 text-gray-900 text-xs outline-none focus:border-violet-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── PDF Area ── -->
      <main class="flex-1 overflow-auto bg-gray-100 p-8" @click="closeDropdownOnClickOutside">

        <div v-if="pdfLoading" class="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
          <div class="w-9 h-9 rounded-full border-2 border-gray-300 border-t-violet-500 animate-spin" />
          <p class="text-sm">Loading PDF…</p>
        </div>

        <div v-else-if="pdfError" class="flex flex-col items-center justify-center h-full gap-4 text-gray-400 text-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p class="text-sm max-w-xs">{{ pdfError }}</p>
          <button
            class="px-4 py-1.5 rounded border border-gray-300 text-gray-400 text-xs hover:border-violet-500 hover:text-violet-400 transition-colors"
            @click="loadPdf"
          >Retry</button>
        </div>

        <div v-else class="flex justify-center min-h-full">
          <div class="flex flex-col items-center gap-6" :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center' }">

            <div
              v-for="pageNum in totalPages"
              :key="pageNum"
              :ref="el => setPageRef(el, pageNum)"
              :class="['relative bg-white rounded shadow-2xl overflow-visible', activeTool === 'sign' ? 'cursor-crosshair' : '']"
              :data-page="pageNum"
              @click="onPageClick($event, pageNum)"
              @mousemove="onMouseMove($event, pageNum)"
              @mouseleave="mousePageNum = null"
            >
              <canvas :ref="el => setCanvasRef(el, pageNum)" class="block w-full" />

              <div class="absolute top-1.5 right-2.5 text-[10px] text-black/20 pointer-events-none select-none">
                Page {{ pageNum }} / {{ totalPages }}
              </div>

              <!-- Signature overlays -->
              <div
                v-for="sig in getPageSignatures(pageNum)"
                :key="sig.id"
                :class="['absolute rounded border-2 border-dashed group transition-colors',
                  selectedSigId === sig.id
                    ? 'border-violet-500 border-solid shadow-[0_0_0_2px_rgba(124,58,237,0.25)]'
                    : isOwnedByCurrentUser(sig) || !sig.ownerId
                      ? 'border-violet-400/40 hover:border-violet-400'
                      : 'border-gray-400/20 hover:border-gray-400/40']"
                :style="{
                  left: sig.x + 'px', top: sig.y + 'px',
                  width: sig.width + 'px', height: sig.height + 'px',
                  cursor: isOwnedByCurrentUser(sig) || !sig.ownerId ? 'move' : 'default',
                  background: isOwnedByCurrentUser(sig) || !sig.ownerId
                    ? 'rgba(124,58,237,0.04)'
                    : 'rgba(100,100,100,0.03)',
                }"
                @mousedown.stop="onSigMouseDown($event, sig)"
                @click.stop="selectSignature(sig.id)"
              >
                <img v-if="sig.imageSrc" :src="sig.imageSrc" class="w-full h-full object-contain" />
                <div v-else class="w-full h-full flex flex-col items-center justify-center gap-0.5 pointer-events-none"
                  :class="isOwnedByCurrentUser(sig) || !sig.ownerId ? 'text-violet-500' : 'text-gray-400'">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                  </svg>
                  <span class="text-[11px]">{{ isOwnedByCurrentUser(sig) || !sig.ownerId ? 'Sign Here' : 'Locked' }}</span>
                </div>

                <!-- Lock overlay for other users' sigs -->
                <div v-if="sig.ownerId && sig.ownerId !== currentUserId"
                  class="absolute inset-0 flex items-end justify-end p-1 pointer-events-none">
                  <div class="flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/30 text-gray-400">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span class="text-[8px] leading-none">{{ getOwnerName(sig.ownerId) }}</span>
                  </div>
                </div>

                <!-- Assignee label -->
                <div v-if="sig.assignedTo" class="absolute -bottom-4 left-0 text-[9px] text-gray-400 whitespace-nowrap pointer-events-none">
                  {{ sig.assignedTo }}
                </div>

                <!-- Resize handle — own sigs only -->
                <div
                  v-if="isOwnedByCurrentUser(sig) || !sig.ownerId"
                  class="absolute -right-1 -bottom-1 w-3 h-3 bg-violet-500 rounded-sm z-10"
                  style="cursor: se-resize"
                  @mousedown.stop="startResize($event, sig)"
                />

                <!-- Delete button — own sigs only -->
                <button
                  v-if="isOwnedByCurrentUser(sig) || !sig.ownerId"
                  class="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-xs leading-none flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  @click.stop="removeSignature(sig.id)"
                >×</button>
              </div>

              <!-- Ghost cursor -->
              <div
                v-if="activeTool === 'sign' && mousePageNum === pageNum"
                class="absolute pointer-events-none border-2 border-dashed border-violet-400 rounded bg-violet-500/8 z-10"
                :style="{ left: ghostX + 'px', top: ghostY + 'px', width: '160px', height: '60px', transform: 'translate(-50%,-50%)' }"
              />
            </div>

          </div>
        </div>
      </main>
    </div>

    <!-- ── Draw Signature Modal ── -->
    <Teleport to="body">
      <div
        v-if="showDrawModal"
        class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        @click.self="cancelDraw"
      >
        <div class="bg-white border border-gray-200 rounded-2xl w-[620px] shadow-2xl overflow-hidden">

          <div class="flex items-center justify-between px-6 pt-5">
            <div class="flex items-center gap-2 text-base font-bold text-gray-900">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
              </svg>
              Draw Your Signature
            </div>

            <!-- Signing as chip -->
            <div v-if="currentUser" class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300">
              <div class="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                :style="{ background: currentUser.avatarColor ?? '#7c3aed' }">
                {{ initials(currentUser.name) }}
              </div>
              Signing as {{ currentUser.name }}
            </div>

            <button
              class="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 text-gray-400 text-lg hover:bg-red-900/40 hover:text-red-400 transition-colors"
              @click="cancelDraw"
            >×</button>
          </div>

          <div class="flex px-6 pt-4 border-b border-gray-300">
            <button
              v-for="tab in ['draw','type']"
              :key="tab"
              :class="['px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors',
                drawTab === tab
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-gray-400 hover:text-gray-700']"
              @click="drawTab = tab"
            >{{ tab }}</button>
          </div>

          <div v-show="drawTab === 'draw'" class="px-6 pt-5">
            <canvas
              ref="sigCanvas"
              width="560" height="200"
              class="w-full rounded-lg border-2 border-gray-300 bg-white block sig-canvas"
              @mousedown="startDrawing"
              @mousemove="drawOnCanvas"
              @mouseup="stopDrawing"
              @mouseleave="stopDrawing"
              @touchstart.prevent="startDrawingTouch"
              @touchmove.prevent="drawTouch"
              @touchend="stopDrawing"
            />
            <p class="text-[11px] text-gray-500 text-center mt-1.5">Draw your signature above</p>
          </div>

          <div v-show="drawTab === 'type'" class="px-6 pt-5">
            <input
              v-model="typedSignature"
              placeholder="Type your name…"
              class="w-full px-3.5 py-3 rounded-lg bg-white border border-gray-300 text-gray-900 text-base outline-none focus:border-violet-500 transition-colors mb-3"
              @input="renderTypedSig"
            />
            <div class="flex flex-col gap-2">
              <button
                v-for="font in signatureFonts"
                :key="font.value"
                :class="['px-4 py-2.5 rounded-lg border-2 text-[26px] text-left transition-all overflow-hidden text-ellipsis whitespace-nowrap',
                  selectedFont === font.value
                    ? 'border-violet-500 bg-white text-gray-900'
                    : 'border-gray-300 bg-white text-gray-900 hover:border-violet-500/40 hover:bg-gray-50']"
                :style="{ fontFamily: font.value }"
                @click="selectedFont = font.value; renderTypedSig()"
              >{{ typedSignature || 'Your Signature' }}</button>
            </div>
            <canvas ref="typeCanvas" width="560" height="120" class="hidden" />
          </div>

          <div class="flex items-center justify-between flex-wrap gap-3 px-6 py-4 mt-2">
            <div class="flex items-center gap-3">
              <div class="flex gap-1.5">
                <button
                  v-for="c in penColors"
                  :key="c"
                  :class="['w-5 h-5 rounded-full border-2 transition-transform',
                    penColor === c ? 'border-violet-400 scale-125' : 'border-transparent']"
                  :style="{ background: c }"
                  @click="penColor = c; if(drawTab === 'type') renderTypedSig()"
                />
              </div>
              <div v-if="drawTab === 'draw'" class="flex items-center gap-1">
                <button
                  v-for="s in penSizes"
                  :key="s"
                  :class="['w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
                    penSize === s ? 'border-violet-500 bg-violet-500/10' : 'border-gray-300 hover:border-gray-500']"
                  @click="penSize = s"
                >
                  <div :style="{ width: s * 2 + 'px', height: s * 2 + 'px', background: penColor, borderRadius: '50%' }" />
                </button>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <button
                class="px-3.5 py-1.5 rounded-md border border-gray-300 text-gray-400 text-xs hover:border-amber-500 hover:text-amber-400 transition-colors"
                @click="clearCanvas"
              >Clear</button>
              <button
                class="px-3.5 py-1.5 rounded-md border border-gray-300 text-gray-400 text-xs hover:bg-gray-100 transition-colors"
                @click="cancelDraw"
              >Cancel</button>
              <button
                class="px-4 py-1.5 rounded-md bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
                :disabled="!canConfirm"
                @click="confirmSignature"
              >Place Signature</button>
            </div>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

// ─── Props ────────────────────────────────────────────────────────────────────

const props = defineProps({
  /**
   * URL, relative path, or base64 data URI of the PDF.
   */
  pdfUrl: {
    type: String,
    required: true,
  },
  /**
   * Optional display name in the toolbar.
   */
  documentName: {
    type: String,
    default: null,
  },
  /**
   * Pre-populate with existing SignatureDto[] from your API.
   */
  initialSignatures: {
    type: Array,
    default: () => [],
  },
  /**
   * Full list of users available for assignment.
   * Each user: { id, name, emplId, avatarColor? }
   * Example: [{ id: 'u1', name: 'Jane Doe', emplId: 'EMP-001', avatarColor: '#7c3aed' }]
   */
  users: {
    type: Array,
    default: () => [],
  },
  /**
   * The ID of the currently authenticated/active user.
   * Only this user can drag, resize, or modify their own signatures.
   * Example: 'u1'
   */
  currentUserId: {
    type: [String, Number],
    default: null,
  },
})

// ─── Emits ────────────────────────────────────────────────────────────────────

const emit = defineEmits(['save', 'update:signatures'])

// ─── Computed helpers ─────────────────────────────────────────────────────────

const currentUser = computed(() =>
  props.users.find(u => String(u.id) === String(props.currentUserId)) ?? null
)

function isOwnedByCurrentUser(sig) {
  if (!sig.ownerId) return true // legacy / unowned sig — allow interaction
  return String(sig.ownerId) === String(props.currentUserId)
}

function getOwnerName(ownerId) {
  const u = props.users.find(u => String(u.id) === String(ownerId))
  return u ? u.name : 'Other'
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// ─── PDF State ────────────────────────────────────────────────────────────────

const pdfLoading  = ref(false)
const pdfError    = ref(null)
const totalPages  = ref(0)
const pdfDoc      = ref(null)
const pageRefs    = ref({})
const canvasRefs  = ref({})
const renderedSet = ref(new Set())

const pdfName = computed(() => {
  if (props.documentName) return props.documentName
  try {
    const url = new URL(props.pdfUrl, location.href)
    const seg = url.pathname.split('/')
    return decodeURIComponent(seg[seg.length - 1]) || 'Document.pdf'
  } catch {
    return 'Document.pdf'
  }
})

function setPageRef(el, n)   { if (el) pageRefs.value[n]   = el }
function setCanvasRef(el, n) {
  if (el) {
    canvasRefs.value[n] = el
    nextTick(() => renderPage(n))
  }
}

// ─── PDF.js ───────────────────────────────────────────────────────────────────

async function loadPdf() {
  pdfLoading.value = true
  pdfError.value   = null
  totalPages.value = 0
  renderedSet.value.clear()

  try {
    if (!window.pdfjsLib) {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
    pdfDoc.value     = await window.pdfjsLib.getDocument(props.pdfUrl).promise
    totalPages.value = pdfDoc.value.numPages
  } catch (err) {
    pdfError.value = `Failed to load PDF: ${err.message}`
    console.error('[SignaturePlacer]', err)
  } finally {
    pdfLoading.value = false
  }
}

async function renderPage(n) {
  if (!pdfDoc.value || renderedSet.value.has(n)) return
  const canvas = canvasRefs.value[n]
  if (!canvas) return
  try {
    const page     = await pdfDoc.value.getPage(n)
    const viewport = page.getViewport({ scale: 1.5 })
    canvas.width   = viewport.width
    canvas.height  = viewport.height
    const pageEl = pageRefs.value[n]
    if (pageEl) {
      pageEl.style.width     = viewport.width + 'px'
      pageEl.style.minHeight = viewport.height + 'px'
    }
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    renderedSet.value.add(n)
  } catch (err) {
    console.error(`[SignaturePlacer] renderPage(${n})`, err)
  }
}

function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return }
    const s = Object.assign(document.createElement('script'), { src, onload: res, onerror: rej })
    document.head.appendChild(s)
  })
}

// ─── Signatures ───────────────────────────────────────────────────────────────

const signatures    = ref([])
const selectedSigId = ref(null)
const nextId        = ref(1)

watch(() => props.initialSignatures, (val) => {
  if (val?.length) {
    signatures.value = val.map(s => ({ ...s }))
    nextId.value = Math.max(...val.map(s => s.id), 0) + 1
  }
}, { immediate: true })

watch(signatures, (val) => emit('update:signatures', buildDtos(val)), { deep: true })

const selectedSig = computed(() => signatures.value.find(s => s.id === selectedSigId.value) ?? null)

function getPageSignatures(page) { return signatures.value.filter(s => s.page === page) }
function selectSignature(id)     { selectedSigId.value = id }
function removeSignature(id) {
  signatures.value = signatures.value.filter(s => s.id !== id)
  if (selectedSigId.value === id) selectedSigId.value = null
}

// ─── Assignee Dropdown ───────────────────────────────────────────────────────

const assigneeDropdownOpen = ref(false)
const userSearchQuery      = ref('')
const dropdownRef          = ref(null)

const filteredUsers = computed(() => {
  const q = userSearchQuery.value.toLowerCase()
  return props.users.filter(u =>
    u.name.toLowerCase().includes(q) || (u.emplId ?? '').toLowerCase().includes(q)
  )
})

const selectedAssigneeUser = computed(() => {
  if (!selectedSig.value?.assignedUserId) return null
  return props.users.find(u => String(u.id) === String(selectedSig.value.assignedUserId)) ?? null
})

function assignUser(user) {
  if (!selectedSig.value) return
  selectedSig.value.assignedUserId = user?.id ?? null
  selectedSig.value.assignedTo     = user?.name ?? null
  selectedSig.value.assignedEmplId = user?.emplId ?? null
  assigneeDropdownOpen.value = false
  userSearchQuery.value = ''
}

function closeDropdownOnClickOutside() {
  assigneeDropdownOpen.value = false
}

// ─── Tool / Zoom ──────────────────────────────────────────────────────────────

const activeTool = ref('select')
const zoom       = ref(1)
function zoomIn()  { zoom.value = Math.min(zoom.value + 0.15, 2.5) }
function zoomOut() { zoom.value = Math.max(zoom.value - 0.15, 0.3) }

// ─── Ghost Cursor ─────────────────────────────────────────────────────────────

const ghostX       = ref(0)
const ghostY       = ref(0)
const mousePageNum = ref(null)

function onMouseMove(event, pageNum) {
  if (activeTool.value !== 'sign') return
  const r = event.currentTarget.getBoundingClientRect()
  ghostX.value       = (event.clientX - r.left) / zoom.value
  ghostY.value       = (event.clientY - r.top)  / zoom.value
  mousePageNum.value = pageNum
}

// ─── Page Click → Modal ───────────────────────────────────────────────────────

const showDrawModal = ref(false)
const pendingPos    = ref({ x: 0, y: 0 })
const pendingPage   = ref(1)

function onPageClick(event, pageNum) {
  if (activeTool.value !== 'sign') return
  const r = event.currentTarget.getBoundingClientRect()
  pendingPos.value  = {
    x: Math.max(0, (event.clientX - r.left) / zoom.value - 80),
    y: Math.max(0, (event.clientY - r.top)  / zoom.value - 30),
  }
  pendingPage.value   = pageNum
  showDrawModal.value = true
  drawTab.value       = 'draw'
  hasDrawn.value      = false
  typedSignature.value = ''
  nextTick(() => clearCanvas())
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

const drawTab        = ref('draw')
const sigCanvas      = ref(null)
const typeCanvas     = ref(null)
const typedSignature = ref('')
const selectedFont   = ref('Dancing Script, cursive')
const penColor       = ref('#111827')
const penSize        = ref(2)
const isDrawing      = ref(false)
const hasDrawn       = ref(false)

const penColors = ['#111827', '#1d4ed8', '#7c3aed', '#b91c1c', '#065f46']
const penSizes  = [1, 2, 4, 7]
const signatureFonts = [
  { value: 'Dancing Script, cursive' },
  { value: 'Pacifico, cursive' },
  { value: 'Great Vibes, cursive' },
]

const canConfirm = computed(() =>
  drawTab.value === 'type' ? typedSignature.value.trim().length > 0 : hasDrawn.value
)

function getCtx() {
  const c = sigCanvas.value; if (!c) return null
  const ctx = c.getContext('2d')
  Object.assign(ctx, { strokeStyle: penColor.value, lineWidth: penSize.value, lineCap: 'round', lineJoin: 'round' })
  return ctx
}
function pos(e, c)  { const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height } }
function tpos(t, c) { const r = c.getBoundingClientRect(); return { x: (t.clientX - r.left) * c.width / r.width, y: (t.clientY - r.top) * c.height / r.height } }

function startDrawing(e)      { isDrawing.value = true; const ctx = getCtx(); const p = pos(e, sigCanvas.value); ctx?.beginPath(); ctx?.moveTo(p.x, p.y) }
function drawOnCanvas(e)      { if (!isDrawing.value) return; const ctx = getCtx(); const p = pos(e, sigCanvas.value); ctx?.lineTo(p.x, p.y); ctx?.stroke(); hasDrawn.value = true }
function stopDrawing()        { isDrawing.value = false }
function startDrawingTouch(e) { isDrawing.value = true; const ctx = getCtx(); const p = tpos(e.touches[0], sigCanvas.value); ctx?.beginPath(); ctx?.moveTo(p.x, p.y) }
function drawTouch(e)         { if (!isDrawing.value) return; const ctx = getCtx(); const p = tpos(e.touches[0], sigCanvas.value); ctx?.lineTo(p.x, p.y); ctx?.stroke(); hasDrawn.value = true }

function clearCanvas() {
  hasDrawn.value = false
  const c = sigCanvas.value; if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height)
}

function renderTypedSig() {
  const c = typeCanvas.value; if (!c) return
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.font = `64px ${selectedFont.value}`
  ctx.fillStyle = penColor.value
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(typedSignature.value, c.width / 2, c.height / 2)
}

// ─── Confirm Signature ────────────────────────────────────────────────────────

function confirmSignature() {
  let imageSrc = null
  if (drawTab.value === 'draw' && sigCanvas.value) {
    imageSrc = sigCanvas.value.toDataURL('image/png')
  } else if (drawTab.value === 'type' && typeCanvas.value) {
    renderTypedSig()
    imageSrc = typeCanvas.value.toDataURL('image/png')
  }

  const pageEl       = pageRefs.value[pendingPage.value]
  const canvasWidth  = pageEl?.offsetWidth  ?? 794
  const canvasHeight = pageEl?.offsetHeight ?? 1123
  const W = 160, H = 60
  const x = Math.max(0, Math.min(pendingPos.value.x, canvasWidth  - W))
  const y = Math.max(0, Math.min(pendingPos.value.y, canvasHeight - H))

  // Auto-assign to current user if available
  const owner = currentUser.value

  signatures.value.push({
    id: nextId.value++,
    page: pendingPage.value,
    x, y, width: W, height: H,
    canvasWidth, canvasHeight,
    color:          penColor.value,
    imageSrc,
    isEmpty:        false,
    // Ownership — locks drag/resize to this user
    ownerId:        owner?.id ?? null,
    // Assignment fields — auto-filled from currentUser, can be changed in properties
    assignedUserId: owner?.id ?? null,
    assignedTo:     owner?.name ?? null,
    assignedEmplId: owner?.emplId ?? null,
    signedBy:       owner?.name ?? null,
    signedDate:     new Date().toISOString().split('T')[0],
  })

  selectedSigId.value  = signatures.value[signatures.value.length - 1].id
  showDrawModal.value  = false
  hasDrawn.value       = false
  typedSignature.value = ''
}

function cancelDraw() {
  showDrawModal.value  = false
  hasDrawn.value       = false
  typedSignature.value = ''
}

// ─── Drag (current user only) ─────────────────────────────────────────────────

let dragOff = { x: 0, y: 0 }, draggingSig = null, draggingPageNum = null

function onSigMouseDown(e, sig) {
  if (!isOwnedByCurrentUser(sig)) return   // 🔒 block other users
  startDrag(e, sig)
}

function getPageRect(pageNum) {
  const el = pageRefs.value[pageNum]
  return el ? el.getBoundingClientRect() : null
}

function clientToPage(clientX, clientY, pageNum) {
  const rect = getPageRect(pageNum)
  if (!rect) return { x: clientX, y: clientY }
  return {
    x: (clientX - rect.left) / zoom.value,
    y: (clientY - rect.top)  / zoom.value,
  }
}

function startDrag(e, sig) {
  draggingSig     = sig
  draggingPageNum = sig.page
  const local     = clientToPage(e.clientX, e.clientY, sig.page)
  // Store offset from cursor to top-left of the sig box
  dragOff = { x: local.x - sig.x, y: local.y - sig.y }
  window.addEventListener('mousemove', onDragMove)
  window.addEventListener('mouseup',   stopDrag)
}

function onDragMove(e) {
  if (!draggingSig) return
  const pageEl = pageRefs.value[draggingPageNum]
  if (!pageEl) return
  const rect   = pageEl.getBoundingClientRect()
  const localX = (e.clientX - rect.left) / zoom.value
  const localY = (e.clientY - rect.top)  / zoom.value
  // Clamp within page bounds
  const maxX   = (pageEl.offsetWidth  - draggingSig.width)
  const maxY   = (pageEl.offsetHeight - draggingSig.height)
  draggingSig.x = Math.max(0, Math.min(localX - dragOff.x, maxX))
  draggingSig.y = Math.max(0, Math.min(localY - dragOff.y, maxY))
}

function stopDrag() {
  draggingSig = null
  draggingPageNum = null
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup',   stopDrag)
}

// ─── Resize (current user only) ───────────────────────────────────────────────

let resizingSig = null, rs = { x: 0, y: 0, w: 0, h: 0 }

function startResize(e, sig) {
  if (!isOwnedByCurrentUser(sig)) return   // 🔒 block other users
  resizingSig = sig
  // Store starting mouse position in screen coords and original size
  rs = { x: e.clientX, y: e.clientY, w: sig.width, h: sig.height }
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup',   stopResize)
}
function onResizeMove(e) {
  if (!resizingSig) return
  // Delta in screen pixels → divide by zoom to get page-local delta
  const dx = (e.clientX - rs.x) / zoom.value
  const dy = (e.clientY - rs.y) / zoom.value
  resizingSig.width  = Math.max(60, rs.w + dx)
  resizingSig.height = Math.max(24, rs.h + dy)
}
function stopResize() { resizingSig = null; window.removeEventListener('mousemove', onResizeMove); window.removeEventListener('mouseup', stopResize) }

// ─── Save / DTO ───────────────────────────────────────────────────────────────

const isSaving   = ref(false)
const saveStatus = ref(null)
let saveTimer = null

function buildDtos(sigs) {
  return sigs.map(s => ({
    id:             s.id,
    page:           s.page,
    x:              +s.x.toFixed(4),
    y:              +s.y.toFixed(4),
    width:          +s.width.toFixed(4),
    height:         +s.height.toFixed(4),
    canvasWidth:    s.canvasWidth,
    canvasHeight:   s.canvasHeight,
    color:          s.color          ?? null,
    imageSrc:       s.imageSrc       ?? null,
    isEmpty:        s.isEmpty        ?? false,
    ownerId:        s.ownerId        ?? null,
    assignedUserId: s.assignedUserId ?? null,
    assignedTo:     s.assignedTo     ?? null,
    assignedEmplId: s.assignedEmplId ?? null,
    signedBy:       s.signedBy       ?? null,
    signedDate:     s.signedDate     ?? null,
  }))
}

async function saveSignatures() {
  isSaving.value   = true
  saveStatus.value = 'saving'
  clearTimeout(saveTimer)

  const payload = buildDtos(signatures.value)

  try {
    emit('save', payload)
    await new Promise(r => setTimeout(r, 500))
    saveStatus.value = 'saved'
    saveTimer = setTimeout(() => { saveStatus.value = null }, 2500)
  } finally {
    isSaving.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

onMounted(() => {
  if (!document.getElementById('sig-gfonts')) {
    const l = document.createElement('link')
    l.id   = 'sig-gfonts'
    l.rel  = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Pacifico&family=Great+Vibes&display=swap'
    document.head.appendChild(l)
  }
  loadPdf()
})

onBeforeUnmount(() => {
  clearTimeout(saveTimer)
  draggingSig     = null
  draggingPageNum = null
  resizingSig     = null
  window.removeEventListener('mousemove', onDragMove)
  window.removeEventListener('mouseup',   stopDrag)
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup',   stopResize)
})

watch(() => props.pdfUrl, () => {
  renderedSet.value.clear()
  signatures.value    = []
  selectedSigId.value = null
  loadPdf()
})
</script>

<style>
.sig-canvas { cursor: crosshair; }
</style>