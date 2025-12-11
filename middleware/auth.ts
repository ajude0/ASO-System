import { getToken,encryptData } from "~/js/cryptoToken";

export default defineNuxtRouteMiddleware(async (to, from) => {
  if (!process.client) return;
  const token = getToken();

  const fullUrl = window.location.href;
  const hashQuery = fullUrl.split("?")[1];

  if (hashQuery) {
    const transactionId = new URLSearchParams(hashQuery).get("transactionid");
    const documenturlId = new URLSearchParams(hashQuery).get("documenturlid");

    if (transactionId) {
      localStorage.setItem("aso_urltransactionId", encryptData(transactionId));
      localStorage.removeItem("documentUrlId");
    }
    if(documenturlId){
      localStorage.setItem("documenturlid", encryptData(documenturlId));
      localStorage.removeItem("aso_urltransactionId");
    }
  }
  
  if (to.path === "/" && token) {
    return navigateTo("/main/dashboard");
  }

  if (!token && to.path !== "/") {
    alert('Unauthorized! Please log in first.');
    return navigateTo("/"); 
  }
});
