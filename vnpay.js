import crypto from 'crypto';
import qs from 'qs';

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

// Sắp xếp object theo thứ tự A-Z key để ký chính xác
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
    vnp_Amount: amount * 100,
    vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  sortedParams.vnp_SecureHash = secureHash;

  return `${vnpayConfig.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}

// Xác minh checksum trong IPN từ VNPAY
function verifyIpnQuery(query) {
  const vnp_Params = { ...query };
  const secureHash = vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const checkHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === checkHash;
}

// Hàm xác minh checksum rút gọn cho IPN (alias)
function verifyVnpayChecksum(params, receivedSecureHash) {
  const vnp_Params = { ...params };
  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === receivedSecureHash;
}

export {
  vnpayConfig,
  generatePaymentUrl,
  verifyIpnQuery,
  verifyVnpayChecksum,
  sortObject,
};
