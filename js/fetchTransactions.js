import { API_BASE_URL } from "~/config";
import { getToken,getTransactionId } from "./cryptoToken";

export const query = ref({
  Search: "",
  Status: "",
  IsApproved: "",
  SortBy: 'Createddate',  // default sort (backend fallback also handles this)
  IsDescending: true,
  PageNumber: 1, // Default to first page
  PageSize: 5,
});

export const totalEntries = ref(0);
export const totalPages = ref(0);
export const loading = ref(false);
export const myTransactions = ref([]);
export const isTxLoading = ref([]);
export const isLoading = ref(false);
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
    console.log("Transaction Data:", response);
  } catch (error) {
    console.error("Error fetching transactions:", error);
  } finally {
    setTimeout(() => {
      isTxLoading.value = false;
    }, 200);
  }
};

export const getMyTransaction = async () => {
  isLoading.value = true;
  const token = getToken();
  const transactionId = getTransactionId();
  try {
    const response = await $fetch(
      `${API_BASE_URL}/api/Transaction/get-forms/${transactionId}`,
      {
        headers: {
          token: token,
        },
      }
    );
    transactions.value = response;
    console.log(transactions.value);
  } catch (error) {
    console.error("Error fetching transactions:", error);
  } finally {
    setTimeout(() => {
      isLoading.value = false;
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

export const sortBy = (column) => {
  if (query.value.SortBy === column) {
    // reverse direction if same column clicked again
    query.value.IsDescending = !query.value.IsDescending
  } else {
    query.value.SortBy = column
    query.value.IsDescending = false
  }
  getMyTransactions()
}

export const changePageSize = () => {
  query.value.PageNumber = 1 // reset to first page
  getMyTransactions()
}


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

export const softDeleteTransaction = async (id,$swal) => {
  loading.value = true;
  const token = getToken();

  try {
    await $fetch(`${API_BASE_URL}/api/Transaction/soft-delete/${id}`, {
      method: "POST",
      headers: {
        token: token,
      },
    });
      $swal.fire({
      title: "Deleted!",
      text: "The request has been deleted.",
      icon: "success",
      timer: 1000, // auto-close after 2 seconds
      showConfirmButton: false,
    });
    getMyTransactions();
  } catch (error) {
    console.error("Error deleting transaction:", error);
    $swal.fire({
      icon: "error",
      title: "Error",
      text: error?.data?.message || "Failed to close the transaction.",
    });
  } finally{
    loading.value = false;
  }
};

export const closedTransaction = async (id, $swal) => {
  loading.value = true;
  const token = getToken();

  try {
    await $fetch(`${API_BASE_URL}/api/Transaction/close-transaction/${id}`, {
      method: "POST",
      headers: {
        token: token,
      },
    });

    $swal.fire({
      icon: "success",
      title: "Transaction Closed",
      text: "The transaction has been successfully closed.",
      timer: 2000,
      showConfirmButton: false,
    });

    getMyTransactions();
  } catch (error) {
    console.error("Error closing transaction:", error);

    $swal.fire({
      icon: "error",
      title: "Error",
      text: error?.data?.message || "Failed to close the transaction.",
    });
  } finally {
    loading.value = false;
  }
};

