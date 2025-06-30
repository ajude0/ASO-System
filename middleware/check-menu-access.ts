import { allPageNames} from "~/js/fetchMenu";

export default defineNuxtRouteMiddleware(async (to, from) => {
  const allPages: string[] = allPageNames.value || [];

 
  if (!allPages.length) {
    return;
  }

  const pageName = to.name as string;

  if (!allPages.includes(pageName)) {
    alert('Unauthorized!');
    return navigateTo("/main/dashboard");
  }
});
