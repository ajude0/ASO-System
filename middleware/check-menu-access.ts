import { fetchUserMenu,allPageNames } from "~/js/fetchMenu";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const allPages: string[] = allPageNames.value || [];

  if (!allPages.length) {
    return; 
  }

  const pageName = to.name as string;

  if (!allPages.includes(pageName)) {
    const isConfirmed = confirm("Unauthorized!");
    return navigateTo("/main/dashboard"); 
  }

  

});
