import axios from 'axios';
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: [
    '@nuxtjs/tailwindcss',
  ],
  // css: [
  //   '~/assets/css/input.css'
  // ],
  ssr: false,
  router: {
    options: {
      hashMode: true
    }
  }
})
