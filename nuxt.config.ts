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
  },
  app: {
    baseURL:'/aso', //add baseurl when generating the project
  },
  runtimeConfig: {
    // Public config (available on client and server)
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
     
    }
  },
   vite: {
    esbuild: {
       drop: ['console', 'debugger'], // removes console.log and debugger in production
     },
   },
})
