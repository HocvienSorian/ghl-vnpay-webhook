// vnpay.js
import crypto from 'crypto';
import qs from 'qs';

// Cấu hình VNPAY lấy từ biến môi trường
const vnpayConfig = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: process.env.VNP_TMNCODE,
  vnp_HashSecret: process.env.VNP_HASHSECRET,
  vnp_Url: process.env.VNP_URL,
  vnp_ReturnUrl: process.env.VNP_RETURNURL,
  vnp_CurrCode: 'VND',
  vnp_Locale: 'vn',
};

// Sắp xếp các key object theo thứ tự alphabet để tạo chữ ký chính xác
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

// Tạo URL thanh toán VNPAY
function generatePaymentUrl({ amount, orderId, orderInfo, ipAddr }) {
  const createDate = new Date().toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);

  const vnp_Params = {
    vnp_Version: vnpayConfig.vnp_Version,
    vnp_Command: vnpayConfig.vnp_Command,
    vnp_TmnCode: vnpayConfig.vnp_TmnCode,
    vnp_Locale: vnpayConfig.vnp_Locale,
    vnp_CurrCode: vnpayConfig.vnp_CurrCode,
    vnp_TxnRef: orderId.toString(),
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Amount: amount * 100, // VNPAY yêu cầu đơn vị là đồng * 100
    vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // Gắn secureHash vào tham số
  sortedParams.vnp_SecureHash = secureHash;

  // Tạo URL đầy đủ
  return `${vnpayConfig.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}

// Xác minh checksum khi nhận IPN từ VNPAY
function verifyIpnQuery(query) {
  const vnp_Params = { ...query };
  const receivedHash = vnp_Params.vnp_SecureHash;

  // Bỏ các trường không tham gia ký
  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return receivedHash === calculatedHash;
}

// Alias tiện dụng để xác minh checksum
function verifyVnpayChecksum(params, receivedSecureHash) {
  const sortedParams = sortObject(params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return calculatedHash === receivedSecureHash;
}

export {
  vnpayConfig,
  generatePaymentUrl,
  verifyIpnQuery,
  verifyVnpayChecksum,
  sortObject,
};
