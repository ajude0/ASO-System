import { useRoute, useRouter } from "vue-router";
import { API_BASE_URL } from "~/config";
import { getToken } from "~/js/cryptoToken";

 
export const useMenuService = () => {
  const fetchMenuList = async () => {
    const route = useRoute();
    const router = useRouter();
   
 
    // const token = decrypt(localStorage.getItem("user_lor2"));
 
    try {
        const token = getToken();
      const response = await $fetch(`${API_BASE_URL}/api/Menu/get-user-menu`, {
        method: "GET",
        headers: {
          token: token,
        },
      });
      const data = response;
      const routeMap = {};
      data.forEach((menuGroup) => {
        (menuGroup.pages || []).forEach((page) => {
          if (page.stage) {
            routeMap[page.stage] = `/main/${menuGroup.name}/${page.stage}`;
          }
        });
      });
      // Map API response to our menu structure
      return data.map((menuGroup) => ({
        title: menuGroup.name,
        isopen: false,
        route: routeMap[menuGroup.stage] || `/main/${menuGroup.stage}`,
        isActive: false,
        submenu: menuGroup.pages.map((page) => ({
          title: page.name,
          isclick: false,
          route: routeMap[page.stage] || `/main/${page.stage}`,
          icon: page.icon, // Optional icon mapping
        })),
      }));
    } catch (error) {
      console.error("Error fetching menu:", error);
      /* alert("Unauthorized!");
     
      return navigateTo("/"); */
    } finally {

    }
  };
 
  return { fetchMenuList };
};