<template>
  <header class="relative z-10 h-10 py-9 w-full items-center bg-white shadow md:h-10 lg:rounded-br-1xl">
    <div class="relative mx-auto flex h-full flex-col justify-center px-3">
      <div class="relative flex w-full items-center pl-1 sm:ml-0 sm:pr-2">
        <div class="relative left-0 flex h-full w-3/4">
          <div class="group relative flex h-full w-12 items-center">
            <button type="button" aria-expanded="false" aria-label="Toggle sidenav"
              class="text-4xl text-gray-500 focus:outline-none" @click="toggleSidebar">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
                <path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
              </svg>
            </button>
            <div class="flex ml-5 md:mr-24 md:flex hidden">
              <a class="flex">
                <span @click="Dashboard()" class="cursor-pointer self-center text-xl font-semibold sm:text-2xl whitespace-nowrap ">APPROVAL ONLINE SYSTEM</span>
              </a>
            </div>
          </div>
    
        </div>
        <div class="relative font-[sans-serif] w-max mx-auto m:right-auto sm:mr-0">
          <button type="button" @click="toggleDropdown" class="px-4 py-2 flex items-center text-sm ">
            <img src="../static/images/UserIcon.png" class="w-8 h-8 mr-3 rounded-full shrink-0"></img>
            {{user? `${user.lastname}, ${user.firstname}` : 'Test User'}}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3 fill-gray-400 inline ml-3" viewBox="0 0 24 24">
              <path fill-rule="evenodd"
                d="M11.99997 18.1669a2.38 2.38 0 0 1-1.68266-.69733l-9.52-9.52a2.38 2.38 0 1 1 3.36532-3.36532l7.83734 7.83734 7.83734-7.83734a2.38 2.38 0 1 1 3.36532 3.36532l-9.52 9.52a2.38 2.38 0 0 1-1.68266.69734z"
                clip-rule="evenodd" data-original="#000000" />
            </svg>
          </button>
          <ul v-if="isDropdownOpen"
            class='absolute block shadow-lg bg-white py-2 z-[1000] min-w-full w-max rounded-lg max-h-96 overflow-auto'>
            <!-- <li class='py-2.5 px-5 flex items-center hover:bg-gray-100 text-[#333] text-sm cursor-pointer'>
              <svg xmlns=" http://www.w3.org/2000/svg" fill="currentColor" class="w-4 h-4 mr-3" viewBox="0 0 512 512">
                <path
                  d="M337.711 241.3a16 16 0 0 0-11.461 3.988c-18.739 16.561-43.688 25.682-70.25 25.682s-51.511-9.121-70.25-25.683a16.007 16.007 0 0 0-11.461-3.988c-78.926 4.274-140.752 63.672-140.752 135.224v107.152C33.537 499.293 46.9 512 63.332 512h385.336c16.429 0 29.8-12.707 29.8-28.325V376.523c-.005-71.552-61.831-130.95-140.757-135.223zM446.463 480H65.537V376.523c0-52.739 45.359-96.888 104.351-102.8C193.75 292.63 224.055 302.97 256 302.97s62.25-10.34 86.112-29.245c58.992 5.91 104.351 50.059 104.351 102.8zM256 234.375a117.188 117.188 0 1 0-117.188-117.187A117.32 117.32 0 0 0 256 234.375zM256 32a85.188 85.188 0 1 1-85.188 85.188A85.284 85.284 0 0 1 256 32z"
                  data-original="#000000"></path>
              </svg>
              View profile
            </li> -->
            <li @click="Dashboard()"
              class='py-2.5 px-5 flex items-center hover:bg-gray-100 text-[#333] text-sm cursor-pointer'>
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-4 h-4 mr-3" viewBox="0 0 512 512">
                <path
                  d="M197.332 170.668h-160C16.746 170.668 0 153.922 0 133.332v-96C0 16.746 16.746 0 37.332 0h160c20.59 0 37.336 16.746 37.336 37.332v96c0 20.59-16.746 37.336-37.336 37.336zM37.332 32A5.336 5.336 0 0 0 32 37.332v96a5.337 5.337 0 0 0 5.332 5.336h160a5.338 5.338 0 0 0 5.336-5.336v-96A5.337 5.337 0 0 0 197.332 32zm160 480h-160C16.746 512 0 495.254 0 474.668v-224c0-20.59 16.746-37.336 37.332-37.336h160c20.59 0 37.336 16.746 37.336 37.336v224c0 20.586-16.746 37.332-37.336 37.332zm-160-266.668A5.337 5.337 0 0 0 32 250.668v224A5.336 5.336 0 0 0 37.332 480h160a5.337 5.337 0 0 0 5.336-5.332v-224a5.338 5.338 0 0 0-5.336-5.336zM474.668 512h-160c-20.59 0-37.336-16.746-37.336-37.332v-96c0-20.59 16.746-37.336 37.336-37.336h160c20.586 0 37.332 16.746 37.332 37.336v96C512 495.254 495.254 512 474.668 512zm-160-138.668a5.338 5.338 0 0 0-5.336 5.336v96a5.337 5.337 0 0 0 5.336 5.332h160a5.336 5.336 0 0 0 5.332-5.332v-96a5.337 5.337 0 0 0-5.332-5.336zm160-74.664h-160c-20.59 0-37.336-16.746-37.336-37.336v-224C277.332 16.746 294.078 0 314.668 0h160C495.254 0 512 16.746 512 37.332v224c0 20.59-16.746 37.336-37.332 37.336zM314.668 32a5.337 5.337 0 0 0-5.336 5.332v224a5.338 5.338 0 0 0 5.336 5.336h160a5.337 5.337 0 0 0 5.332-5.336v-224A5.336 5.336 0 0 0 474.668 32zm0 0"
                  data-original="#000000"></path>
              </svg>
              Dashboard
            </li>
            <li @click="Logout()"
              class='py-2.5 px-5 flex items-center hover:bg-gray-100 text-[#333] text-sm cursor-pointer'>
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="w-4 h-4 mr-3" viewBox="0 0 6.35 6.35">
                <path
                  d="M3.172.53a.265.266 0 0 0-.262.268v2.127a.265.266 0 0 0 .53 0V.798A.265.266 0 0 0 3.172.53zm1.544.532a.265.266 0 0 0-.026 0 .265.266 0 0 0-.147.47c.459.391.749.973.749 1.626 0 1.18-.944 2.131-2.116 2.131A2.12 2.12 0 0 1 1.06 3.16c0-.65.286-1.228.74-1.62a.265.266 0 1 0-.344-.404A2.667 2.667 0 0 0 .53 3.158a2.66 2.66 0 0 0 2.647 2.663 2.657 2.657 0 0 0 2.645-2.663c0-.812-.363-1.542-.936-2.03a.265.266 0 0 0-.17-.066z"
                  data-original="#000000"></path>
              </svg>
              Logout
            </li>
          </ul>
        </div>
      </div>
    </div>
  </header>
</template>
<script setup>
import { ref } from 'vue';
import { toggleSidebar } from "./store";
import { getProfile, user} from "~/js/fetchUserProfile";
const router = useRouter();
useHead({
  title: 'ASO',
  meta: [
    { name: 'ASO', content: 'Approval Online System.' }
  ],
  link: [
    { rel: 'icon', type: 'image/pnh', href: window.location.origin +'/_nuxt/static/images/logo_head.png' } 
  ]
});
const isDropdownOpen = ref(false);

function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
}


function Logout() {
  localStorage.clear();
  router.push('/')
}

function Dashboard() {
  router.push('/main/dashboard')
}
onMounted(async () => {
  getProfile();
});

</script>
