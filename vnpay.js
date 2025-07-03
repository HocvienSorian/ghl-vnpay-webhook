// vnpay.js
import crypto from 'crypto';
import qs from 'qs';

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function getVnpConfig() {
  const required = ['VNP_TMNCODE', 'VNP_HASHSECRET', 'VNP_URL', 'VNP_RETURNURL'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`❌ Thiếu biến môi trường: ${missing.join(', ')}`);
  }
  return {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNP_TMNCODE.trim(),
    vnp_HashSecret: process.env.VNP_HASHSECRET.trim(),
    vnp_Url: process.env.VNP_URL.trim(),
    vnp_ReturnUrl: process.env.VNP_RETURNURL.trim(),
    vnp_CurrCode: 'VND',
    vnp_Locale: 'vn',
  };
}

function generatePaymentUrl({
  amount,
  orderInfo,
  ipAddr,
  bankCode = '',
  orderType = 'other',
  locale = 'vn',
}) {
  const cfg = getVnpConfig();

  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // GMT+7
  const createDate = now.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const txnRef = `${now.getTime()}`.slice(-8);

  const vnp_Params = {
    vnp_Version: cfg.vnp_Version,
    vnp_Command: cfg.vnp_Command,
    vnp_TmnCode: cfg.vnp_TmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: cfg.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: encodeURIComponent(cfg.vnp_ReturnUrl), // ✅ encode trước khi ký
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = secureHash;

  console.log("🧾 signData:", signData);
  console.log("🔐 secureHash:", secureHash);

  return `${cfg.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}

function verifyVnpResponse(queryParams) {
  const cfg = getVnpConfig();
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams;

  const sortedParams = sortObject(rest);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
  const hash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log("📥 VERIFY signData:", signData);
  console.log("🔐 Received hash:", vnp_SecureHash);
  console.log("🔐 Calculated hash:", hash);

  return hash === vnp_SecureHash;
}

export {
  generatePaymentUrl,
  verifyVnpResponse,
  sortObject,
};
