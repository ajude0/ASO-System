export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ["@nuxtjs/tailwindcss"],

  ssr: false,

  router: {
    options: {
      hashMode: true,
    },
  },

  app: {
    baseURL: "/aso",
    head: {
      script: [
        {
          src: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.min.js",
        },
      ],
    },
  },

  runtimeConfig: {
    // Server-only
    secretKey: process.env.SECRET_KEY,

    public: {
      localApi: process.env.LOCAL_API,
      liveApi: process.env.LIVE_API,
      secretKey: process.env.SECRET_KEY,
    },
  },

  vite: {
    esbuild: {
      drop: ["console", "debugger"],
    },
  },
});
