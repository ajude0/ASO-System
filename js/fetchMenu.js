import { API_BASE_URL } from "~/config"
import { getToken } from "./cryptoToken";
export const nenunames =ref([]);
export const menuList = ref([])
export const sidemenuspinner = ref(false)
export const canDelete = ref(false);
export const canEdit = ref(false);
export const userId = ref(77943) // Replace with real user ID
export const systemCode = ref(84) // Replace with your system code
export const allPageNames = ref([]);
const router = useRouter();


export const handleChildMenuClick = (menuCode) => {
  router.push(`/main/${menuCode}`);
}

export const fetchUserMenu = async () => {
  const token = getToken();
  sidemenuspinner.value = false
  try {
    const data = await $fetch(`${API_BASE_URL}/api/Menu/get-user-menu`, {
      method: 'GET',
      headers: {
        token: token,
      },
      query: {
        systemCode: systemCode.value,
      },
      
    })
    if (data) {
      menuList.value = data
      console.log(menuList.value);
       allPageNames.value = getAllPageNames(data);
      sidemenuspinner.value = true
    }
  } catch (error) {
    alert('Failed to load menu list.')
  }
}

export const fetchCanAccess = async (menucode) => {
  const token = getToken();
  sidemenuspinner.value = false
  try {
    const data = await $fetch(`${API_BASE_URL}/api/Menu/access-usermenu`, {
      method: 'GET',
      headers: {
        token: token,
      },
      query: {
        userId: userId.value,
        menucode: menucode,
      },
    })

    if (data) {
      canDelete.value = data.candelete;
      canEdit.value = data.canedit;
      nenunames.value = data.nenunames.split('->');
    }
  } catch (error) {
    alert('Failed to load menu list.')
  }
}
export const getAllPageNames = (menuItems) => {
  const pageNames = [];

  const extractNames = (items) => {
    items.forEach(item => {
      if (item.pages && Array.isArray(item.pages)) {
        item.pages.forEach(subPage => {
          pageNames.push(subPage.name);
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


