export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
  ],

  ssr: false,

  router: {
    options: {
      hashMode: true
    }
  },

  app: {
    baseURL: '/aso',
    head: {
      script: [
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js"
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
    }
  },

  vite: {
    esbuild: {
      drop: ['console', 'debugger'],
    },
  }
});
