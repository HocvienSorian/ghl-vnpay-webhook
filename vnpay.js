// vnpay.js
import crypto from 'crypto';
import qs from 'qs';

// ✅ Sắp xếp tham số theo thứ tự alphabet tăng dần
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// ✅ Đọc cấu hình từ biến môi trường
function getVnpConfig() {
  const requiredEnvs = ['VNP_TMNCODE', 'VNP_HASHSECRET', 'VNP_URL', 'VNP_RETURNURL'];
  const missing = requiredEnvs.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`❌ Thiếu biến môi trường: ${missing.join(', ')}`);
  }

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

  // ✅ Lấy thời gian GMT+7
  const now = new Date();
  const gmt7 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const createDate = gmt7.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);

  // ✅ Tính expireDate +15 phút GMT+7
  const expire = new Date(gmt7.getTime() + 15 * 60 * 1000);
  const expireDate = expire.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);

  const txnRef = `${gmt7.getFullYear()}${gmt7.getMonth() + 1}${gmt7.getDate()}${gmt7.getTime().toString().slice(-6)}`;

  const vnp_Params = {
    vnp_Version: config.vnp_Version,
    vnp_Command: config.vnp_Command,
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Amount: Math.round(amount * 100), // ✅ nhân 100 đúng chuẩn
    vnp_CurrCode: config.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Locale: locale,
    vnp_ReturnUrl: config.vnp_ReturnUrl, // Không encode ở đây để VNPAY tự xử lý
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate,
  };

  if (bankCode) {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: true }); // ✅ Encode để hash

  const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = secureHash;

  console.log('🧾 signData:', signData);
  console.log('🔐 secureHash:', secureHash);

  return `${config.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}

// ✅ Xác minh chữ ký phản hồi từ VNPAY
function verifyVnpResponse(queryParams) {
  const config = getVnpConfig();
  const params = { ...queryParams };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;

  const sortedParams = sortObject(params);
  const signData = qs.stringify(sortedParams, { encode: true }); // ✅ Encode để hash

  const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
  const hash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

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
