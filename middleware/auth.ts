import { getToken } from "~/js/cryptoToken";

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (process.client) {
    const token = getToken();

    if (!token) {
      const isConfirmed = confirm("Unauthorized!");
      if (isConfirmed) {
        return navigateTo("/"); // Redirect to login page
      } else {
        return navigateTo("/"); // Redirect to home or another page if they cancel
      }
    }
  }
});