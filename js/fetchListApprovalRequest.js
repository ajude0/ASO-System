import { getToken } from "./cryptoToken";
import { API_BASE_URL } from "~/config";

export const query = ref({
  Search: "",
  Status:"",
  IsApproved: "",
  PageNumber: 1,
  PageSize: 5,
});

export const totalEntries = ref(0);
export const totalPages = ref(0);
export const listOfTransactions = ref({});
export const loading = ref(false);

export const getListOfTransactions = async () => {
  loading.value = true;
  const token = getToken();
  try {
    if (!query.value || !query.value.PageSize) {
      throw new Error("PageSize is required in query.");
    }

    const response = await $fetch(`${API_BASE_URL}/api/Approver`, {
      headers: {
        token: token,
      },
      params: { ...query.value },
    });

    if (!response || !response.transactions) {
      throw new Error("No transactions found or error in response.");
    }

    listOfTransactions.value = response.transactions;
    totalEntries.value = response.totalCount;
    totalPages.value = Math.ceil(response.totalCount / query.value.PageSize);
  } catch (error) {
    console.error("Error fetching transactions:", error.message || error);
  } finally {
    loading.value = false;
  }
};

export const confirmApproval = async (id,remarks) => {
  const token = getToken();
  try {
    await $fetch(`${API_BASE_URL}/api/Approver/approved/${id}`, {
      method: "POST",
      headers: {
        token: token,
      },
      body: JSON.stringify({ remarks }),
    });
    getListOfTransactions();
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
};

export const rejectApproval = async (id,remarks) => {
  const token = getToken();
  try {
    await $fetch(`${API_BASE_URL}/api/Approver/rejected/${id}`, {
      method: "POST",
      headers: {
        token: token,
      },
      body: JSON.stringify({ remarks }),
    });
    getListOfTransactions();
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
};

export const changePage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  query.value.PageNumber = page;
  getListOfTransactions();
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
