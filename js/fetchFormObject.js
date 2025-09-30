import { API_BASE_URL } from "~/config";
import { getToken, getFormId } from "./cryptoToken";

export const forms = ref([{}]);
export const loading = ref(false);
export const atSymbols = ref([]);

const extractAtSymbols = (html) => {
  const matches = html.match(/@\w+/g) || [];
  const excluded = ["@user", "@createdDate", "@approvername", "@approverdate","@media"];
  return [...new Set(matches)].filter((m) => !excluded.includes(m));
};

export const getFormObject = async () => {
  const formId = getFormId();
  const token = getToken();
  loading.value = true;
  try {
    const data = await $fetch(
      `${API_BASE_URL}/api/FormObject/get-form/${formId}`,
      {
        headers: {
          token: token,
        },
      }
    );

    forms.value = data;
    console.log("Fetched form data:", data);
    if (data.templatefile) {
      // 2. Fetch HTML from server using file path
      const htmlContent = await $fetch(
        `${API_BASE_URL}/api/Pdf/template-html-from-path`,
        {
          query: { filePath: data.templatefile },
        }
      );

      // 3. Extract @symbols from HTML
      const symbols = extractAtSymbols(htmlContent);
      atSymbols.value = symbols;
    } else {
      atSymbols.value = null;
    }
  } catch (error) {
    console.error("Error fetching menus:", error);
  } finally {
    loading.value = false;
  }
};
