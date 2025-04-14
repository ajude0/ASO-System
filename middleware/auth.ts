import { getToken } from "~/js/cryptoToken";

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (!process.client) return;

  const token = getToken();
  
  if (to.path === "/" && token) {
    return navigateTo("/main/dashboard");
  }

  if (!token && to.path !== "/") {
    const isConfirmed = confirm("Unauthorized! Please log in first.");
    return navigateTo("/"); 
  }
});
