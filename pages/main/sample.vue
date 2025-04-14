<template>
  <ul>
    <li v-if="sidemenuspinner" v-for="(parent, index) in menuList" :key="index">
      <button
        type="button"
        class="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg group hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        :aria-controls="'dropdown-' + index"
        :data-collapse-toggle="'dropdown-' + index"
        @click="toggleMenu(index)"
      >
        <svg
          class="flex-shrink-0 w-6 h-6 text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
          />
        </svg>
        <span class="flex-1 ml-3 text-left whitespace-nowrap">
          {{ parent.name }}
        </span>
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      <ul :id="'dropdown-' + index" class="hidden py-2 space-y-2">
        <li v-for="(child, childIndex) in parent.pages" :key="childIndex">
          <a
            class="flex items-center p-2 text-base text-gray-900 transition duration-75 rounded-lg pl-11 group hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="handleChildMenuClick(child.stage)"
            style="cursor: pointer;"
          >
            {{ child.name }}
          </a>
        </li>
      </ul>
    </li>
  </ul>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFetch } from '#app'
import { API_BASE_URL } from '~/config'

const router = useRouter()
const menuList = ref([])
const sidemenuspinner = ref(false)
const systemCode = ref(84) // Replace with your system code



const handleChildMenuClick = (menuCode) => {
  router.push({ name: menuCode }) // Match with Nuxt route names
}

const fetchUserMenu = async () => {
  sidemenuspinner.value = false
  try {
    const data = await $fetch(`${API_BASE_URL}/api/Menu/get-user-menu`, {
      method: 'GET',
      query: {
        userId: userId.value,
        systemCode: systemCode.value,
      },
    })
    console.log(data);
    if (data) {
      menuList.value = data
      console.log(menuList.value);
      sidemenuspinner.value = true
    }
  } catch (error) {
    alert('Failed to load menu list.')
  }
}

onMounted(() => {
  fetchUserMenu()
})
</script>
