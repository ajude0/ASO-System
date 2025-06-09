import CryptoJS from "crypto-js";

export const encryptData = (data) => {
  console.log("sample");
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


export const encryptSignatureUrl = (data) => {
  const secretKey = CryptoJS.enc.Utf8.parse("samplekeys123456"); // Must be 16 chars for AES-128
  const iv = CryptoJS.enc.Utf8.parse("ivvector12345678");        // Also 16 chars
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), secretKey, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return encrypted.ciphertext.toString(CryptoJS.enc.Base64); // Just ciphertext (no metadata)
};

