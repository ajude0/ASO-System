
// export const API_BASE_URL = "https://apps.fastlogistics.com.ph/asoapi"
// export const API_BASE_URL = "https://localhost:7182"

const config = useRuntimeConfig()
const isProd = process.env.NODE_ENV === 'production';

export const API_BASE_URL = isProd
    ? config.public.liveApi
    : config.public.localApi;
