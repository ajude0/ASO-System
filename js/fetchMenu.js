import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const nenunames = ref([]);
export const menuList = ref([]);
export const sysdescription = ref();
export const sidemenuspinner = ref(false);
export const canAdd = ref(false);
export const canDelete = ref(false);
export const canEdit = ref(false);
export const userId = ref(77943); // Replace with real user ID
export const systemCode = ref(84); // Replace with your system code
export const allPageNames = ref([]);
export const loading = ref(false);
const router = useRouter();

export const handleChildMenuClick = (menuCode) => {
  router.push(`/main/${menuCode}`);
};

export const fetchUserMenu = async () => {
  const token = getToken();
  loading.value = true;
  sidemenuspinner.value = false;
  try {
    const data = await $fetch(`${API_BASE_URL}/api/Menu/get-user-menu`, {
      method: "GET",
      headers: {
        token: token,
      },
      query: {
        systemCode: systemCode.value,
      },
    });
    if (data) {
      menuList.value = data;
      allPageNames.value = getAllPageNames(data);
      sidemenuspinner.value = true;
    }
  } catch (error) {
    if (confirm("Unauthorized")) {
      localStorage.clear();
      return navigateTo("/"); 
    }
  } finally{
    loading.value = false;
  }
};

export const fetchCanAccess = async (menucode) => {
  const token = getToken();
  sidemenuspinner.value = false;
  try {
    const data = await $fetch(`${API_BASE_URL}/api/Menu/access-usermenu`, {
      method: "GET",
      headers: {
        token: token,
      },
      query: {
        userId: userId.value,
        menucode: menucode,
      },
    });

    if (data) {
      sysdescription.value = data.sysdescription;
      canAdd.value = data.canadd;
      canDelete.value = data.candelete;
      canEdit.value = data.canedit;
      nenunames.value = data.nenunames.split("->");
    }
  } catch (error) {
    if (confirm("Unauthorizeds")) {
      localStorage.clear();
      return navigateTo("/"); 
    }
  }
};

export const getAllPageNames = (menuItems) => {
  const pageNames = [];

  const extractNames = (items) => {
    items.forEach((item) => {
      if (item.pages && Array.isArray(item.pages)) {
        item.pages.forEach((subPage) => {
          pageNames.push(subPage.stage);
          // If there are deeper levels of pages
          if (subPage.pages && Array.isArray(subPage.pages)) {
            extractNames([subPage]);
          }
        });
      }
    });
  };

  extractNames(menuItems);
  return pageNames;
};

export const fetchSysDescription = async () => {
  const token = getToken();
  try {
    const data = await $fetch(`${API_BASE_URL}/api/Menu/system-description`, {
      method: "GET",
      headers: {
        token: token,
      },
    });
    if (data) {
      sysdescription.value = data;
    }
  } catch (error) {
    if (confirm("Unauthorized")) {
      localStorage.clear();
      // Redirect to login or logout page
      return navigateTo("/"); 
    }
  }
};
