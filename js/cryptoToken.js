import CryptoJS from "crypto-js";

export const encryptData = (data) => {
  const config = useRuntimeConfig();
  const secretKey = config.public.secretKey; // 👈 note the `.public`
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

export const decryptData = (encryptedData) => {
  const config = useRuntimeConfig();
  const secretKey = config.public.secretKey; // 👈 note the `.public`
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

export const getToken = () => {
  const encryptedToken = localStorage.getItem("user_token_aso");
  return encryptedToken ? decryptData(encryptedToken) : null;
};
export const getFormId = () => {
  const encryptedToken = localStorage.getItem("formId");
  return encryptedToken ? decryptData(encryptedToken) : null;
};
export const getTransactionId = () => {
  const encryptedToken = localStorage.getItem("transactionId");
  return encryptedToken ? decryptData(encryptedToken) : null;
};

export const getDocumentId = () => {
  const encryptedToken = localStorage.getItem("documentId");
  return encryptedToken ? decryptData(encryptedToken) : null;
};

export const getUrlTransactionId = () => {
  const encryptedToken = localStorage.getItem("aso_urltransactionId");
  return encryptedToken ? decryptData(encryptedToken) : null;
};

export const getUrlDocumentId = () => {
  const encryptedToken = localStorage.getItem("documenturlid");
  return encryptedToken ? decryptData(encryptedToken) : null;
};

export const getSignDocumentId = () => {
  const encryptedToken = localStorage.getItem("signDocumentId");
  return encryptedToken ? decryptData(encryptedToken) : null;
};

export const clearAsoStorage = () => {
  const keys = [
    "user_token_aso",
    "formId",
    "transactionId",
    "documentId",
    "aso_urltransactionId",
    "documenturlid",
    "signDocumentId",
    "user_token_aso"
  ];

  keys.forEach(key => localStorage.removeItem(key));
};

