<script setup>
import { useRoute } from "vue-router";
import { onMounted, watch } from "vue";

import TopBar from "../dashboard/TopBar.vue";
import Overlay from "../dashboard/Overlay.vue";
import Sidebar from "../dashboard/sidebar/Sidebar.vue";
import Footer from "../dashboard/Footer.vue";

import { closeSidebar, sidebarOpen } from "../dashboard/store";

const route = useRoute();

onMounted(() => {
  document.documentElement.style.overflow = "hidden";
});
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
        (function(){
        var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
        s1.async=true;
        s1.src='https://embed.tawk.to/6211d95b1ffac05b1d7ac12c/1fsari3nm';
        s1.charset='UTF-8';
        s1.setAttribute('crossorigin','*');
        s0.parentNode.insertBefore(s1,s0);
        })();

watch(route, () => {
  if (sidebarOpen && window.innerWidth < 1024) {
    closeSidebar();
  }
});
</script>
<template>
  <div class="">
    <div class="flex items-start">
      <Overlay />
     <Sidebar mobile-orientation="start" />
      <div class="flex flex-col min-h-screen w-full overflow-x-auto">
        <TopBar />
        <main class="flex-1 overflow-auto md:pb-8 lg:px-4 relative">
          <!-- Added relative here -->
          <div class="relative h-[85vh] overflow-auto shadow-md">
            <!-- Wrapper div for slot content -->
            <slot />
            <!-- Moved inside the slot wrapper -->
            <Footer />
          </div>    
        </main>
      </div>
    </div>
  </div>
</template>
