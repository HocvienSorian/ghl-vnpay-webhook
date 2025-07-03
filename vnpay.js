// vnpay.js
import crypto from 'crypto';
import qs from 'qs';

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
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

// ✅ Tạo URL thanh toán
function generatePaymentUrl({
  amount,
  orderInfo,
  ipAddr,
  bankCode = '',
  orderType = 'other',
  locale = 'vn',
}) {
  const vnpayConfig = getVnpConfig();

  const now = new Date(Date.now() + 7 * 60 * 60 * 1000); // GMT+7
  const createDate = now.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const expireDate = new Date(now.getTime() + 15 * 60 * 1000)
    .toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const txnRef = `${now.getTime()}`.slice(-8);

  const vnp_Params = {
    vnp_Version: vnpayConfig.vnp_Version,
    vnp_Command: vnpayConfig.vnp_Command,
    vnp_TmnCode: vnpayConfig.vnp_TmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: vnpayConfig.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: encodeURIComponent(vnpayConfig.vnp_ReturnUrl), // ✅ Encode trước khi ký
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) {
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);

  // ✅ Build signData (giữ nguyên encode=false)
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  sortedParams.vnp_SecureHash = secureHash;

  // 🔥 DEBUG
  console.log("🧾 signData:", signData);
  console.log("🔐 secureHash:", secureHash);

  // ✅ Build final URL (encode=false để tránh double encode)
  return `${vnpayConfig.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}

// ✅ Kiểm tra chữ ký phản hồi từ VNPAY
function verifyVnpResponse(queryParams) {
  const vnpayConfig = getVnpConfig();
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams;

  const sortedParams = sortObject(rest);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
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
