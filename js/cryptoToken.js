import CryptoJS from "crypto-js";

export const encryptData = (data) => {
  const secretKey = "asndkandkandadjneunfuenskdjnfsukesjnfusasdadad";
  return CryptoJS.AES.encrypt(JSON.stringify(data), secretKey).toString();
};

export const decryptData = (encryptedData) => {
  const secretKey = "asndkandkandadjneunfuenskdjnfsukesjnfusasdadad";
  const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

export const getToken = () => {
  const encryptedToken = localStorage.getItem("aso_token");
  return encryptedToken ? decryptData(encryptedToken) : null;
};

