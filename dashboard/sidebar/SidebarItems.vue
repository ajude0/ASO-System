<script setup>
import SidebarItem from "./SidebarItem.vue";
import DashboardIcon from "./icons/DashboardIcon.vue";
import ChecklistIcon from "./icons/ChecklistIcon.vue";
import FacilityIcon from "./icons/FacilityIcon.vue";
import AmbassadorIcon from "./icons/AmbassadorIcon.vue";
import CompanyIcon from "./icons/CompanyIcon.vue";
import { sidebarOpen } from "../store";

const menulist = ref([
  {
    title: "Title 1",
    isopen: false,
    submenu: [
      {
        title: "sub1",
        isclick: false,
      },
      {
        title: "sub2",
        isclick: false,
      },
      {
        title: "sub3",
        isclick: false,
      },
    ],
  },
  {
    title: "Title 2",
    isopen: false,
    submenu: [
      {
        title: "sub1",
        isclick: false,
      },
      {
        title: "sub2",
        isclick: false,
      },
      {
        title: "sub3",
        isclick: false,
      },
    ],
  },
]);

// Toggle dropdown
const toggleDropdown = (menu) => {
  menu.isopen = !menu.isopen;
  closeOtherMenus(menu);
};

const closeOtherMenus = (currentMenu) => {
  menulist.value.forEach((menu) => {
    if (menu !== currentMenu) {
      menu.isopen = false;
    }
  });
};

const SubOnClick = (sub, menu) => {
  sub.isclick = !sub.isclick;
  closeOtherSubMenus(sub, menu);
};

const closeOtherSubMenus = (currentSubMenu, currentMenu) => {
  menulist.value.forEach((menu) => {
    if (menu === currentMenu) {
      menu.submenu.forEach((sub) => {
        if (sub !== currentSubMenu) {
          sub.isclick = false;
        }
      });
    } else {
      menu.submenu.forEach((sub) => {
        sub.isclick = false;
      });
    }
  });
};
</script>

<template>
  <ul class="md:pl-3">
    <li>
      <button
        class="my-2 flex w-full items-center text-black-950 justify-start p-4 font-thin uppercase transition-colors duration-50 lg:hover:text-black-950">
        <span>
          <DashboardIcon />
        </span>
        <label v-if="sidebarOpen" class="ml-2">Dashboard</label>
      </button>
    </li>
    <!-- Parent Menu -->
    <li v-for="(item, index) in menulist" :key="index" class="relative">
      <button @click="toggleDropdown(item)"
        class="my-2 flex w-full items-center text-black-950 justify-between p-4 font-thin uppercase transition-colors duration-50 lg:hover:text-black-950"
        :class="item.isopen &&
          ''
          ">
        <div class="flex">
          <span v-if="item.title == 'Title 1'">
            <CompanyIcon />
          </span>
          <span v-else>
            <AmbassadorIcon />
          </span>

          <label v-if="sidebarOpen" class="ml-2"> {{ item.title }}</label>
        </div>
        <span v-if="sidebarOpen"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor" class="w-6 h-6" v-if="!item.isopen">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
            stroke="currentColor" class="w-6 h-6" v-else>
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </span>
      </button>
      <ul class="ml-8"
        :class="{ hidden: !item.isopen }, { 'absolute w-52 -right-52 top-0 bg-black-950': !sidebarOpen }">
        <!-- Sub Menu -->
        <li v-for="(sub, index) in item.submenu" :key="index">
          <button @click="SubOnClick(sub, item); toggleDropdown(item)"
            class="my-2 flex w-full items-center text-black-50 justify-start p-4 font-thin uppercase transition-colors duration-200 lg:hover:text-black-500"
            :class="sub.isclick &&
              'bg-gradient-to-r border-r-4 border-gray-500 from-gray-800 to-gray-100'
              ">
            •

            <label class="ml-2"> {{ sub.title }}</label>
          </button>
        </li>
      </ul>
    </li>

    <!-- <SidebarItem title="Company" to="/main/maintenance/company">
      <CompanyIcon />
    </SidebarItem>

    <SidebarItem title="Checklist" to="/main/maintenance/checklist">
      <ChecklistIcon />
    </SidebarItem>

    <SidebarItem title="Facility" to="/main/maintenance/facility">
      <FacilityIcon />
    </SidebarItem>

    <SidebarItem title="Ambassador" to="/main/maintenance/ambassador">
      <AmbassadorIcon />
    </SidebarItem> -->
  </ul>
</template>
