import { API_BASE_URL } from "~/config";
import { getToken } from "./cryptoToken";

export const query = ref({
  Search: "",
  Status: "",
  IsApproved: "",
  PageNumber: 1, // Default to first page
  PageSize: 5,
});

export const totalEntries = ref(0);
export const totalPages = ref(0);
export const loading = ref(false);
export const myTransactions = ref([]);
export const isTxLoading = ref([]);
export const transactions = ref({ formObjects: [] });

export const getTransaction = async (transactionId) => {
  isTxLoading.value = true;
  const token = getToken();
  try {
    const response = await $fetch(
      `${API_BASE_URL}/api/Transaction/${transactionId}`,
      {
        headers: {
          token: token,
        },
      }
    );
    transactions.value = response;
  } catch (error) {
    console.error("Error fetching transactions:", error);
  } finally {
    setTimeout(() => {
      isTxLoading.value = false;
    }, 200);
  }
};

export const getMyTransactions = async () => {
  loading.value = true;
  const token = getToken();
  try {
    const response = await $fetch(`${API_BASE_URL}/api/Transaction`, {
      headers: {
        token: token,
      },
      params: { ...query.value },
    });

    myTransactions.value = response.transactions;
    totalEntries.value = response.totalCount;
    totalPages.value = Math.ceil(response.totalCount / query.value.PageSize);
  } catch (error) {
    console.error("Error fetching myTransactions:", error);
  } finally {
    setTimeout(() => {
      loading.value = false;
    }, 200);
  }
};

export const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  query.value.PageNumber = page;
  getMyTransactions();
};

export const generatePagination = () => {
  if (totalPages.value <= 1) return [];
  let pages = [];
  const current = query.value.PageNumber;
  const maxVisible = 5;

  if (totalPages.value <= maxVisible) {
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i);
    }
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");

    let start = Math.max(2, current - 1);
    let end = Math.min(totalPages.value - 1, current + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (current < totalPages.value - 2) pages.push("...");
    pages.push(totalPages.value);
  }
  return pages;
};

export const softDeleteTransaction = async (id) => {
  loading.value = true;
  const token = getToken();

  try {
    await $fetch(`${API_BASE_URL}/api/Transaction/soft-delete/${id}`, {
      method: "POST",
      headers: {
        token: token,
      },
    });
    getMyTransactions();
  } catch (error) {
    console.error("Error deleting transaction:", error);
  } finally{
    loading.value = false;
  }
};
