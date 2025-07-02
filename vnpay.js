// vnpay.js
import crypto from 'crypto';

// ✅ Hàm sắp xếp object theo key (a → z)
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// ✅ Hàm tự build query string không encode
function buildQueryString(params) {
  return Object.entries(params)
    .map(([key, val]) => `${key}=${val}`)
    .join('&');
}

// ✅ Load biến môi trường cấu hình VNPAY
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
  bankCode = '',
  orderInfo,
  orderType = 'other',
  locale = 'vn',
  ipAddr,
}) {
  const vnpayConfig = getVnpConfig();

  const date = new Date();
  const createDate = date.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const txnRef = date.toTimeString().slice(0, 8).replace(/:/g, '');

  const vnp_Params = {
    vnp_Version: vnpayConfig.vnp_Version,
    vnp_Command: vnpayConfig.vnp_Command,
    vnp_TmnCode: vnpayConfig.vnp_TmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: vnpayConfig.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo, // ❗Không encode
    vnp_OrderType: orderType,
    vnp_Amount: amount,
    vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl, // ❗Không encode
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);
  const signData = buildQueryString(sortedParams);

  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  sortedParams.vnp_SecureHash = secureHash;

  // 🔍 DEBUG
  console.log('🧾 signData:', signData);
  console.log('🔐 secureHash:', secureHash);

  // ✅ Trả về URL thanh toán không encode (để giữ đúng cấu trúc)
  return `${vnpayConfig.vnp_Url}?${buildQueryString(sortedParams)}`;
}

// ✅ Xác minh phản hồi từ VNPAY (ReturnURL hoặc IPN)
function verifyVnpResponse(queryParams) {
  const vnpayConfig = getVnpConfig();
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams;

  const sortedParams = sortObject(rest);
  const signData = buildQueryString(sortedParams);

  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const hash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return hash === vnp_SecureHash;
}

export {
  generatePaymentUrl,
  verifyVnpResponse,
  sortObject,
};
