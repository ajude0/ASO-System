<script setup>
import { ref, watch } from "vue";

const formDetails = ref({
  formObjects: [
    { id: "email", label: "Email", objecttype: "TEXTBOX" },
    { id: "fullname", label: "Full Name", objecttype: "TEXTBOX" },
  ],
});

const formAnswers = ref({});
const formDisplays = ref({});
const capsSettings = ref({}); // per input setting

// 🔍 Detect capitalization style automatically
function detectCapsStyle(id) {
  const text = formAnswers.value[id] || "";

  if (text === text.toUpperCase() && /[A-Z]/.test(text)) {
    capsSettings.value[id] = "uppercase";
  } else if (text === text.toLowerCase() && /[a-z]/.test(text)) {
    capsSettings.value[id] = "lowercase";
  } else {
    capsSettings.value[id] = "original";
  }
}

// ✍️ Apply user-selected capitalization
function applyCapsSetting(id) {
  const setting = capsSettings.value[id];
  let text = formAnswers.value[id] || "";

  if (setting === "uppercase") text = text.toUpperCase();
  else if (setting === "lowercase") text = text.toLowerCase();
  // original = keep as is

  formAnswers.value[id] = text;
  formDisplays.value[id] = text;
}

// 🧠 Auto-apply whenever setting changes
watch(capsSettings, (newSettings) => {
  for (const id in newSettings) {
    applyCapsSetting(id);
  }
}, { deep: true });

// 💾 Example save function (simulate saving to DB)
function saveForm() {
  console.log("Saving to DB:", formAnswers.value);
  alert("Data saved! Check console for formatted output.");
}
</script>

<template>
  <div class="max-w-xl mx-auto mt-6 p-4 border rounded-lg shadow">
    <h2 class="text-xl font-bold mb-4 text-gray-700">Form Example</h2>

    <div
      v-for="formObject in formDetails.formObjects"
      :key="formObject.id"
      class="mb-6"
    >
      <label class="block font-semibold mb-1">{{ formObject.label }}</label>

      <input
        v-if="formObject.objecttype === 'TEXTBOX'"
        v-model="formAnswers[formObject.id]"
        @input="detectCapsStyle(formObject.id)"
        @blur="applyCapsSetting(formObject.id)"
        type="text"
        class="border p-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
        placeholder="Enter value..."
      />

      <!-- 🧭 Radio buttons for caps settings -->
      <div class="flex gap-4 mt-2 text-sm text-gray-700">
        <label>
          <input
            type="radio"
            v-model="capsSettings[formObject.id]"
            value="original"
          />
          Original
        </label>
        <label>
          <input
            type="radio"
            v-model="capsSettings[formObject.id]"
            value="uppercase"
          />
          Uppercase
        </label>
        <label>
          <input
            type="radio"
            v-model="capsSettings[formObject.id]"
            value="lowercase"
          />
          Lowercase
        </label>
      </div>

      <div class="mt-2 text-sm text-gray-500">
        Detected: <strong>{{ capsSettings[formObject.id] || 'original' }}</strong>
      </div>
    </div>

    <button
      @click="saveForm"
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      Save Form
    </button>
  </div>
</template>
