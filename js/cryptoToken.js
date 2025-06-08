import CryptoJS from "crypto-js";

export const encryptData = (data) => {
  const secretKey = "samplekeys";
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

export const decryptData = (encryptedData) => {
  const secretKey = "samplekeys";
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

export const getUrlTransactionId = () => {
  const encryptedToken = localStorage.getItem("aso_urltransactionId");
  return encryptedToken ? decryptData(encryptedToken) : null;
};

