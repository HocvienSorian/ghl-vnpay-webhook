// vnpay.js
import crypto from 'crypto';
import qs from 'qs';

function sortObject(obj) {
  return Object.keys(obj).sort().reduce((result, key) => {
    result[key] = obj[key];
    return result;
  }, {});
}

function getVnpConfig() {
  return {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNP_TMNCODE,
    vnp_HashSecret: process.env.VNP_HASHSECRET,
    vnp_Url: process.env.VNP_URL,
    vnp_ReturnUrl: process.env.VNP_RETURNURL,
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
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const createDate = now.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const expireDate = new Date(now.getTime() + 15 * 60 * 1000)
    .toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
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
    vnp_ReturnUrl: cfg.vnp_ReturnUrl, // FORCE RAW
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) vnp_Params['vnp_BankCode'] = bankCode;

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false }); // 🚨 FORCE RAW VALUES
  const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
  const secureHash = hmac.update(signData, 'utf-8').digest('hex');
  sortedParams.vnp_SecureHash = secureHash;

  console.log("🧾 signData:", signData);
  console.log("🔐 secureHash:", secureHash);

  // ✅ Encode ReturnUrl for redirect only
  sortedParams.vnp_ReturnUrl = encodeURIComponent(cfg.vnp_ReturnUrl);

  return `${cfg.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}

function verifyVnpResponse(queryParams) {
  const cfg = getVnpConfig();
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams;

  if (rest.vnp_ReturnUrl) rest.vnp_ReturnUrl = decodeURIComponent(rest.vnp_ReturnUrl);

  const sortedParams = sortObject(rest);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
  const hash = hmac.update(signData, 'utf-8').digest('hex');

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
