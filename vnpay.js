// vnpay.js
import crypto from 'crypto';

// ✅ RFC3986 encode chuẩn cho VNPAY
function rfc3986EncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, c =>
    '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

// ✅ Sắp xếp tham số theo thứ tự alphabet tăng dần
function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = obj[key];
  });
  return sorted;
}

// ✅ Đọc cấu hình từ biến môi trường & loại BOM
function getVnpConfig() {
  function cleanEnv(val) {
    return val.replace(/^\uFEFF/, '').trim();
  }

  const requiredEnvs = ['VNP_TMNCODE', 'VNP_HASHSECRET', 'VNP_URL', 'VNP_RETURNURL'];
  const missing = requiredEnvs.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`❌ Thiếu biến môi trường: ${missing.join(', ')}`);
  }

  return {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: cleanEnv(process.env.VNP_TMNCODE),
    vnp_HashSecret: cleanEnv(process.env.VNP_HASHSECRET),
    vnp_Url: cleanEnv(process.env.VNP_URL),
    vnp_ReturnUrl: cleanEnv(process.env.VNP_RETURNURL),
    vnp_CurrCode: 'VND',
    vnp_Locale: 'vn',
  };
}

// ✅ Tạo URL thanh toán VNPAY
function generatePaymentUrl({
  amount,
  orderInfo,
  ipAddr,
  bankCode = '',
  orderType = 'other',
  locale = 'vn',
}) {
  const config = getVnpConfig();

  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const createDate = now.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const expireDate = new Date(now.getTime() + 15 * 60 * 1000)
    .toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const txnRef = `${now.getTime()}`.slice(-8);

  const vnp_Params = {
    vnp_Version: config.vnp_Version,
    vnp_Command: config.vnp_Command,
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: config.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Locale: locale,
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);

  // ✅ Build signData (encode VALUE chuẩn RFC3986)
  const signData = Object.keys(sortedParams).map(key =>
    `${key}=${rfc3986EncodeURIComponent(sortedParams[key])}`
  ).join('&');

  const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
  const secureHash = hmac.update(signData, 'utf-8').digest('hex');
  sortedParams.vnp_SecureHash = secureHash;

  console.log('🧾 signData:', signData);
  console.log('🔐 secureHash:', secureHash);

  // ✅ Build final redirect URL (encode toàn bộ key & value)
  const queryString = Object.keys(sortedParams).map(key =>
    `${encodeURIComponent(key)}=${encodeURIComponent(sortedParams[key])}`
  ).join('&');

  return `${config.vnp_Url}?${queryString}`;
}

// ✅ Xác minh chữ ký phản hồi từ VNPAY
function verifyVnpResponse(queryParams) {
  const config = getVnpConfig();
  const params = { ...queryParams };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sortedParams = sortObject(params);
  const signData = Object.keys(sortedParams).map(key =>
    `${key}=${rfc3986EncodeURIComponent(sortedParams[key])}`
  ).join('&');

  const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
  const hash = hmac.update(signData, 'utf-8').digest('hex');

  console.log('📥 VERIFY RESPONSE:');
  console.log('↪️ signData:', signData);
  console.log('↪️ secureHash nhận được:', queryParams.vnp_SecureHash);
  console.log('↪️ secureHash tính toán:', hash);

  return hash === queryParams.vnp_SecureHash;
}

export {
  generatePaymentUrl,
  verifyVnpResponse,
  sortObject,
};
