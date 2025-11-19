<script setup>
import { ref } from 'vue';

// State
const isModalOpen = ref(false);
const pdfFile = ref(null);
const signatureFile = ref(null);
const currentUserName = ref('John Doe'); // Current logged-in user

// Available users for assignment
const availableUsers = ref([
  'John Doe',
  'Jane Smith',
  'Mike Johnson',
  'Sarah Williams'
]);

// Pre-placed signature boxes with user assignments
const prePlacedSignatures = ref([
  {
    id: 'sig1',
    assignedTo: 'John Doe',
    page: 1,
    x: 100,
    y: 400,
    width: 180,
    height: 70,
    isEmpty: true,
    imageSrc: null,
    datePosition: null,
    signedBy: null,
    signedDate: null
  },
  {
    id: 'sig2',
    assignedTo: 'Jane Smith',
    page: 1,
    x: 350,
    y: 400,
    width: 180,
    height: 70,
    isEmpty: true,
    imageSrc: null,
    datePosition: null,
    signedBy: null,
    signedDate: null
  },
  {
    id: 'sig3',
    assignedTo: 'Mike Johnson',
    page: 2,
    x: 100,
    y: 500,
    width: 180,
    height: 70,
    isEmpty: true,
    imageSrc: null,
    datePosition: null,
    signedBy: null,
    signedDate: null
  }
]);

// New signature box form
const newSignatureBox = ref({
  assignedTo: availableUsers.value[0],
  page: 1,
  x: 100,
  y: 300,
  width: 180,
  height: 70
});

// File upload handlers
const handlePdfUpload = (event) => {
  const file = event.target.files[0];
  if (file && file.type === 'application/pdf') {
    pdfFile.value = file;
  }
};

const handleSignatureUpload = (event) => {
  const file = event.target.files[0];
  if (file && file.type.startsWith('image/')) {
    signatureFile.value = file;
  }
};

// Switch current user (for demo purposes)
const switchUser = (userName) => {
  currentUserName.value = userName;
  // In real app, this would reload the user's signature
  signatureFile.value = null;
};

// Add new signature box
const addSignatureBox = () => {
  prePlacedSignatures.value.push({
    id: `sig${Date.now()}`,
    assignedTo: newSignatureBox.value.assignedTo,
    page: newSignatureBox.value.page,
    x: newSignatureBox.value.x,
    y: newSignatureBox.value.y,
    width: newSignatureBox.value.width,
    height: newSignatureBox.value.height,
    isEmpty: true,
    imageSrc: null,
    datePosition: null,
    signedBy: null,
    signedDate: null
  });
};

// Remove signature box
const removeSignatureBox = (index) => {
  prePlacedSignatures.value.splice(index, 1);
};

// Open modal
const openSigningModal = () => {
  if (!pdfFile.value) {
    alert('Please upload a PDF first!');
    return;
  }
  if (!signatureFile.value) {
    alert('Please upload your signature image first!');
    return;
  }
  
  // Check if current user has any signatures to sign
  const userSignatures = prePlacedSignatures.value.filter(
    s => s.assignedTo === currentUserName.value && s.isEmpty
  );
  
  if (userSignatures.length === 0) {
    alert(`No pending signatures for ${currentUserName.value}`);
    return;
  }
  
  isModalOpen.value = true;
};

// Handle signature application
const handleApplySignature = ({ index, signatureData }) => {
  prePlacedSignatures.value[index] = {
    ...prePlacedSignatures.value[index],
    ...signatureData,
    isEmpty: false
  };
  console.log('Signature applied:', signatureData);
};

// Close modal
const closeModal = () => {
  isModalOpen.value = false;
};

// Get statistics
const getStats = () => {
  const total = prePlacedSignatures.value.length;
  const signed = prePlacedSignatures.value.filter(s => !s.isEmpty).length;
  const pending = total - signed;
  return { total, signed, pending };
};

const getUserStats = (userName) => {
  const userSigs = prePlacedSignatures.value.filter(s => s.assignedTo === userName);
  const signed = userSigs.filter(s => !s.isEmpty).length;
  const pending = userSigs.length - signed;
  return { total: userSigs.length, signed, pending };
};
</script>

<template>
  <div class="min-h-screen bg-gray-50 p-8">
    <div class="max-w-6xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">PDF Multi-User Signature System</h1>
      <p class="text-gray-600 mb-8">Assign signature boxes to specific users and track signing progress</p>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Setup & Controls -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- Current User -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Current User</h2>
            <div class="flex items-center justify-between mb-4">
              <div>
                <p class="text-sm text-gray-600">Signed in as:</p>
                <p class="text-2xl font-bold text-blue-600">{{ currentUserName }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-600">Your signatures:</p>
                <p class="text-lg">
                  <span class="text-green-600 font-semibold">{{ getUserStats(currentUserName).signed }}</span>
                  <span class="text-gray-400">/</span>
                  <span class="text-gray-700">{{ getUserStats(currentUserName).total }}</span>
                </p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="user in availableUsers"
                :key="user"
                @click="switchUser(user)"
                :class="currentUserName === user ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'"
                class="px-3 py-1 rounded text-sm font-medium transition hover:opacity-80"
              >
                {{ user }}
              </button>
            </div>
          </div>

          <!-- Upload Section -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Upload Documents</h2>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">PDF Document</label>
                <input
                  type="file"
                  accept="application/pdf"
                  @change="handlePdfUpload"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p v-if="pdfFile" class="text-sm text-green-600 mt-1">✓ {{ pdfFile.name }}</p>
              </div>

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Your Signature Image</label>
                <input
                  type="file"
                  accept="image/*"
                  @change="handleSignatureUpload"
                  class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p v-if="signatureFile" class="text-sm text-green-600 mt-1">✓ {{ signatureFile.name }}</p>
              </div>
            </div>
          </div>

          <!-- Sign Document Button -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <button
              @click="openSigningModal"
              :disabled="!pdfFile || !signatureFile"
              class="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-lg"
            >
              🖊️ Sign Document
            </button>
            <p class="text-xs text-gray-500 mt-2 text-center">
              {{ getUserStats(currentUserName).pending }} signature(s) pending for you
            </p>
          </div>

          <!-- Add Signature Box -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Add Signature Box</h2>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select v-model="newSignatureBox.assignedTo" class="w-full border rounded px-3 py-2 text-sm">
                  <option v-for="user in availableUsers" :key="user" :value="user">{{ user }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Page</label>
                <input v-model.number="newSignatureBox.page" type="number" min="1" class="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">X Position</label>
                <input v-model.number="newSignatureBox.x" type="number" class="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Y Position</label>
                <input v-model.number="newSignatureBox.y" type="number" class="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Width</label>
                <input v-model.number="newSignatureBox.width" type="number" class="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Height</label>
                <input v-model.number="newSignatureBox.height" type="number" class="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            
            <button
              @click="addSignatureBox"
              class="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-semibold"
            >
              + Add Signature Box
            </button>
          </div>
        </div>

        <!-- Right Column: Signature List & Stats -->
        <div class="space-y-6">
          
          <!-- Overall Stats -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Document Status</h2>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-600">Total Signatures:</span>
                <span class="font-bold text-lg">{{ getStats().total }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-green-600">Completed:</span>
                <span class="font-bold text-lg text-green-600">{{ getStats().signed }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-orange-600">Pending:</span>
                <span class="font-bold text-lg text-orange-600">{{ getStats().pending }}</span>
              </div>
              <div class="mt-4 pt-4 border-t">
                <div class="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    class="bg-green-600 h-4 rounded-full transition-all duration-300"
                    :style="{ width: `${(getStats().signed / getStats().total * 100) || 0}%` }"
                  ></div>
                </div>
                <p class="text-xs text-gray-500 text-center mt-1">
                  {{ Math.round((getStats().signed / getStats().total * 100) || 0) }}% Complete
                </p>
              </div>
            </div>
          </div>

          <!-- User Breakdown -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">By User</h2>
            <div class="space-y-3">
              <div 
                v-for="user in availableUsers"
                :key="user"
                class="p-3 rounded"
                :class="user === currentUserName ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'"
              >
                <div class="flex justify-between items-center">
                  <span class="font-medium text-sm">{{ user }}</span>
                  <span class="text-sm">
                    <span :class="getUserStats(user).signed === getUserStats(user).total && getUserStats(user).total > 0 ? 'text-green-600' : 'text-gray-600'">
                      {{ getUserStats(user).signed }}/{{ getUserStats(user).total }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Signature List -->
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-xl font-semibold mb-4">Signature Boxes</h2>
            
            <div v-if="prePlacedSignatures.length === 0" class="text-gray-500 text-center py-8 text-sm">
              No signature boxes yet
            </div>

            <div v-else class="space-y-2 max-h-96 overflow-y-auto">
              <div
                v-for="(sig, index) in prePlacedSignatures"
                :key="sig.id"
                class="p-3 border rounded text-sm"
                :class="{
                  'border-green-300 bg-green-50': !sig.isEmpty,
                  'border-blue-300 bg-blue-50': sig.isEmpty && sig.assignedTo === currentUserName,
                  'border-gray-300 bg-gray-50': sig.isEmpty && sig.assignedTo !== currentUserName
                }"
              >
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <p class="font-semibold">{{ sig.assignedTo }}</p>
                    <p class="text-xs text-gray-600">Page {{ sig.page }} • ({{ sig.x }}, {{ sig.y }})</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span v-if="!sig.isEmpty" class="text-green-600 text-xs">✓ Signed</span>
                    <span v-else class="text-orange-600 text-xs">⏳ Pending</span>
                    <button
                      @click="removeSignatureBox(index)"
                      class="text-red-600 hover:text-red-800 text-xs"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div v-if="!sig.isEmpty" class="mt-2 pt-2 border-t text-xs text-gray-600">
                  Signed: {{ sig.signedDate }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Signature Modal Component -->
    <SigntureModal
      :is-open="isModalOpen"
      :pdf-file="pdfFile"
      :signature-file="signatureFile"
      :current-user-name="currentUserName"
      :pre-placed-signatures="prePlacedSignatures"
      @close="closeModal"
      @apply-signature="handleApplySignature"
    />
  </div>
</template>

<script>
import SigntureModal from '~/components/SigntureModal.vue';



</script>