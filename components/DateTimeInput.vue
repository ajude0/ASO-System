<template>
  <div class="time-input-container">
    <div class="input-wrapper" @click="showDropdown = !showDropdown">
      <input
        v-model="displayValue"
        type="text"
        placeholder="Select time"
        class="time-input"
        readonly
      />
      <div class="clock-icon">🕐</div>
    </div>

    <div v-if="showDropdown" class="dropdown">
      <div class="search-section">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          placeholder="Search time"
          class="search-input"
          @input="handleSearch"
        />
      </div>

      <div class="quick-times">
        <button
          v-for="quick in quickTimes"
          :key="quick.label"
          @click="selectTime(quick.label)"
          class="quick-time-btn"
        >
          {{ quick.label }}
        </button>
      </div>

      <div class="time-grid">
        <div
          v-for="time in filteredTimes"
          :key="time"
          @click="selectTime(time)"
          class="time-option"
        >
          {{ time }}
        </div>

        <div v-if="filteredTimes.length === 0" class="no-results">
          No matching times found
        </div>
      </div>
    </div>

    <div
      v-if="showDropdown"
      class="backdrop"
      @click="showDropdown = false"
    ></div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

const showDropdown = ref(false);
const searchQuery = ref("");
const searchInput = ref(null);

// Quick access times
const quickTimes = [
  { label: "7:00 AM" },
  { label: "8:00 AM" },
  { label: "12:00 PM" },
  { label: "3:00 PM" },
  { label: "5:00 PM" },
];

// Generate time options (every 30 minutes)
const timeOptions = computed(() => {
  const times = [];
  const periods = ["AM", "PM"];

  periods.forEach((period) => {
    for (let hour = 1; hour <= 12; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const formattedMinute = minute.toString().padStart(2, "0");
        times.push(`${hour}:${formattedMinute} ${period}`);
      }
    }
  });

  return times;
});

// Filter times based on search query
const filteredTimes = computed(() => {
  if (!searchQuery.value) return timeOptions.value;

  const query = searchQuery.value.toLowerCase().replace(/[^\w]/g, "");
  return timeOptions.value.filter((time) => {
    const timeFormatted = time.toLowerCase().replace(/[^\w]/g, "");
    return (
      timeFormatted.includes(query) ||
      time.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  });
});

const displayValue = computed(() => {
  return props.modelValue || "";
});

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
  if (showDropdown.value) {
    nextTick(() => {
      searchInput.value?.focus();
    });
  } else {
    searchQuery.value = "";
  }
};

const selectTime = (time) => {
  emit("update:modelValue", time);
  showDropdown.value = false;
  searchQuery.value = "";
};

const handleSearch = () => {
  // Auto-complete common patterns
  const query = searchQuery.value.toLowerCase();

  // Handle patterns like "2pm", "10am", "230pm"
  if (query.match(/^\d{1,2}(am|pm)$/)) {
    const hour = query.replace(/[^\d]/g, "");
    const period = query.includes("am") ? "AM" : "PM";
    const formattedTime = `${hour}:00 ${period}`;

    if (timeOptions.value.includes(formattedTime)) {
      selectTime(formattedTime);
      return;
    }
  }

  // Handle patterns like "230pm" -> "2:30 PM"
  if (query.match(/^\d{3,4}(am|pm)$/)) {
    const match = query.match(/^(\d{1,2})(\d{2})(am|pm)$/);
    if (match) {
      const hour = match[1];
      const minute = match[2];
      const period = match[3].toUpperCase();
      const formattedTime = `${hour}:${minute} ${period}`;

      if (timeOptions.value.includes(formattedTime)) {
        selectTime(formattedTime);
        return;
      }
    }
  }
};
</script>

<style scoped>
.time-input-container {
  position: relative;
  width: 100%;
}

.input-wrapper {
  position: relative;
  cursor: pointer;
}

.time-input {
  width: 100%;
  padding: 12px 45px 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 16px;
  background: white;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
}

.time-input:focus {
  outline: none;
  box-shadow: 0 0 0 1px #3b82f6; /* mimic focus:ring-2 focus:ring-blue-500 */
  border-color: #3b82f6;
}

.clock-icon {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
  pointer-events: none;
}

.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e2e8f0;
  
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 50;
  margin-top: 4px;
  overflow: hidden;
}

.search-section {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  outline: none;
  box-shadow: 0 0 0 1px #4282e9; /* mimic focus:ring-2 focus:ring-blue-500 */
  border-color: #3b82f6;
}

.search-input:focus {
  outline: none;
  border: 2px solid blue;
}

.quick-times {
  display: flex;
  gap: 4px;
  padding: 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.quick-time-btn {
  flex: 1;
  padding: 8px 4px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-time-btn:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.time-grid {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px;
}

.time-option {
  padding: 10px;
  text-align: center;
  cursor: pointer;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  font-size: 14px;
}

.time-option:hover {
  background: #3b82f6;
  color: white;
}

.no-results {
  grid-column: 1 / -1;
  padding: 20px;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}

/* Scrollbar styling */
.time-grid::-webkit-scrollbar {
  width: 4px;
}

.time-grid::-webkit-scrollbar-track {
  background: transparent;
}

.time-grid::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.time-grid::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* Animations */
.dropdown {
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
