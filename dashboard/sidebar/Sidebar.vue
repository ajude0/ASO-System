<script setup>
import { sidebarOpen } from "../store";
import { fetchUserMenu, menuList } from "~/js/fetchMenu";
const router = useRouter();

defineProps({
  mobileOrientation: {
    type: String,
    default: "end",
  },
});

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
  fetchUserMenu();
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

const isActive = ref(true);
const open = ref([]);
const menu = ref(null);

const style = {
  mobileOrientation: {
    start: "left-0",
    end: "right-0 lg:left-0",
  },
};

const handleClickOutside = (event) => {
  if (!sidebarOpen.value && menu.value && !menu.value.contains(event.target)) {
    open.value = false;
  }
};

const toggleOpen = (index) => {
  open.value[index] = !open.value[index];
};

function dashboard() {
  router.push("/main/dashboard");
}

function handleChildMenuClick(menuCode) {
  router.push(`/main/${menuCode}`);
}
</script>

<template>
  <div class="app">
    <aside
      class="sidebar-item sidebar scrollbar flex flex-col h-screen px-5 py-8 overflow-y-auto bg-white border-r rtl:border-r-0 rtl:border-l lg:relative lg:z-40 lg:block shadow-lg"
      :class="{
        'relative z-40 w-8/12 sm:w-5/12 md:w-64 transition-all duration-300 ease-in overflow-y-auto visible':
          sidebarOpen,
        'hidden lg:w-20 transition-all duration-300 ease-out': !sidebarOpen,
        [style.mobileOrientation[mobileOrientation]]: true,
      }"
    >
      <!-- <a class="flex ">
        <p v-if="sidebarOpen" dir="ltr" @click="dashboard()" class="cursor-pointer text-white bg-cyan-400 p-2 flex-shrink">LOGO</p><p dir="rtl" class="bg-cyan-400 text-white p-2 flex-shrink">TEST</p>
      </a> -->

      <div class="flex justify-center">
        <img
          v-if="sidebarOpen"
          src="/static/images/logo.png"
          class="h-10 mr-3 h-14 w-auto"
          alt="DatabridgeLogo"
        />
      </div>

      <div class="flex flex-col justify-between flex-1 mt-6">
        <nav class="-mx-3 space-y-6">
          <div class="space-y-3">
            <label
              :class="sidebarOpen ? 'label-normal' : 'label-small'"
              class="px-3 text-xs text-black uppercase"
              >Menu</label
            >
            <a
              @click="dashboard"
              :class="[
                'cursor-pointer flex items-center px-3 py-2 text-gray-600 transition-colors duration-300 transform rounded-lg dark:black-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 hover:text-gray-700',
                { 'bg-gray-800 text-white': $route.path === '/main/dashboard' },
              ]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1.2em"
                height="1.2em"
                viewBox="0 0 24 24"
              >
                <rect width="9" height="9" x="1.5" y="1.5" fill="black" rx="1">
                  <animate
                    id="svgSpinnersBlocksScale0"
                    attributeName="x"
                    begin="0;svgSpinnersBlocksScale1.end+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="1.5;.5;1.5"
                  />
                  <animate
                    attributeName="y"
                    begin="0;svgSpinnersBlocksScale1.end+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="1.5;.5;1.5"
                  />
                  <animate
                    attributeName="width"
                    begin="0;svgSpinnersBlocksScale1.end+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                  <animate
                    attributeName="height"
                    begin="0;svgSpinnersBlocksScale1.end+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                </rect>
                <rect width="9" height="9" x="13.5" y="1.5" fill="black" rx="1">
                  <animate
                    attributeName="x"
                    begin="svgSpinnersBlocksScale0.begin+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="13.5;12.5;13.5"
                  />
                  <animate
                    attributeName="y"
                    begin="svgSpinnersBlocksScale0.begin+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="1.5;.5;1.5"
                  />
                  <animate
                    attributeName="width"
                    begin="svgSpinnersBlocksScale0.begin+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                  <animate
                    attributeName="height"
                    begin="svgSpinnersBlocksScale0.begin+0.15s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                </rect>
                <rect
                  width="9"
                  height="9"
                  x="13.5"
                  y="13.5"
                  fill="black"
                  rx="1"
                >
                  <animate
                    attributeName="x"
                    begin="svgSpinnersBlocksScale0.begin+0.3s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="13.5;12.5;13.5"
                  />
                  <animate
                    attributeName="y"
                    begin="svgSpinnersBlocksScale0.begin+0.3s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="13.5;12.5;13.5"
                  />
                  <animate
                    attributeName="width"
                    begin="svgSpinnersBlocksScale0.begin+0.3s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                  <animate
                    attributeName="height"
                    begin="svgSpinnersBlocksScale0.begin+0.3s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                </rect>
                <rect width="9" height="9" x="1.5" y="13.5" fill="black" rx="1">
                  <animate
                    id="svgSpinnersBlocksScale1"
                    attributeName="x"
                    begin="svgSpinnersBlocksScale0.begin+0.45s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="1.5;.5;1.5"
                  />
                  <animate
                    attributeName="y"
                    begin="svgSpinnersBlocksScale0.begin+0.45s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="13.5;12.5;13.5"
                  />
                  <animate
                    attributeName="width"
                    begin="svgSpinnersBlocksScale0.begin+0.45s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                  <animate
                    attributeName="height"
                    begin="svgSpinnersBlocksScale0.begin+0.45s"
                    dur="0.6s"
                    keyTimes="0;.2;1"
                    values="9;11;9"
                  />
                </rect>
              </svg>
              <span v-if="sidebarOpen" class="mx-2 text-sm font-medium"
                >Dashboard</span
              >
            </a>

            <div
              class="sidebar-dropdown"
              v-for="(parent, index) in menuList"
              :key="index"
            >
              <div v-if="parent">
                <a
                  href="#"
                  @click.prevent="toggleOpen(index)"
                  class="cursor-pointer flex items-center px-3 py-2 text-gray-600 transition-colors duration-300 transform rounded-lg dark:black-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 hover:text-gray-700"
                  :class="{ '': isActive || open[index] }"
                  role="button"
                  aria-haspopup="true"
                  :aria-expanded="open[index] || isActive ? 'true' : 'false'"
                >
                  <span aria-hidden="false">
                    <svg
                      v-if="parent && parent.name === 'Maintenance'"
                      xmlns="http://www.w3.org/2000/svg"
                      width="1.2em"
                      height="1.2em"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        d="m14 23l6-6m1-3a2 2 0 1 0 2 2M17 4h1v1h-1zm-7 19H3V1h18v10M3 13h14M3 18h10M3 8h18"
                      />
                    </svg>
                    <svg
                      v-else
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-6"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                      />
                    </svg>
                  </span>

                  <span v-if="sidebarOpen" class="mx-2 text-sm font-medium">{{
                    parent.name
                  }}</span>
                  <span aria-hidden="true" class="ml-auto">
                    <svg
                      class="w-4 h-4 transition-transform transform"
                      :class="{ 'rotate-180': open[index] }"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </a>
                <div
                  v-if="open[index]"
                  v-show="sidebarOpen || open[index]"
                  :class="[
                    'mt-2 space-y-2 px-7',
                    { 'child-dropdown mt-2 space-y-2': !sidebarOpen },
                  ]"
                  role="menu"
                  aria-label="Dropdown Menu"
                >
                  <a
                    v-for="(child, childIndex) in parent.pages"
                    :key="childIndex"
                    @click="handleChildMenuClick(child.stage)"
                    :class="[
                      'cursor-pointer flex items-center px-3 py-2 text-gray-600 transition-colors duration-300 transform rounded-lg dark:black-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 hover:text-gray-700',
                      {
                        'bg-gray-800 text-white':
                          $route.path === `/main/${child.stage}`,
                      },
                    ]"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke-width="1.5"
                      stroke="currentColor"
                      class="size-6"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                      />
                    </svg>
                    <span
                      v-if="sidebarOpen || open[index]"
                      class="mx-2 text-sm font-medium"
                      >{{ child.name }}</span
                    >
                  </a>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.scrollbar::-webkit-scrollbar {
  width: 0;
  background: transparent;
}

.scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hidden {
  padding-right: -20px;
  transition: width 0.3s ease-out, opacity 0.3s ease-out;
}

.visible {
  opacity: 1;
  transition: width 0.3s ease-in, opacity 0.3s ease-in;
}

.label-normal {
  font-size: 0.75rem;
  padding-left: 0.75rem;
}

.label-small {
  font-size: 0.65rem;
  padding-left: 0.01rem;
}

.sidebar {
  position: relative;
  overflow: visible;
}

.child-dropdown {
  position: absolute;
  top: 0;
  left: calc(100% + 10px);
  background-color: #f7f7f7;
  width: 200px;
  padding: 10px;
  box-shadow: 0 0 15 px rgba(0, 0, 0, 0.1);
  z-index: 9999;
}

.sidebar-item {
  position: relative;
}

.sidebar-dropdown {
  position: relative;
}

.sidebar-item .child-dropdown {
  top: 50%;
  transform: translateY(-50%);
}

@media (max-width: 768px) {
  .sidebar-item {
    position: relative;
    width: 250px;
  }

  .sidebar {
    position: relative;
    overflow: visible;
    padding-right: 20px;
  }

  .sidebar-open {
    display: block;
  }

  .sidebar-closed {
    display: none;
  }

  .child-dropdown {
    position: absolute;
    left: 0;
    width: 100%;
  }
}
</style>
