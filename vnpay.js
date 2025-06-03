const crypto = require('crypto');
const qs = require('qs');

const vnpayConfig = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: process.env.VNP_TMNCODE, // Mã website của bạn trên VNPAY
  vnp_HashSecret: process.env.VNP_HASHSECRET, // Chuỗi bí mật dùng để mã hóa
  vnp_Url: process.env.VNP_URL, // URL thanh toán VNPAY (sandbox hoặc production)
  vnp_ReturnUrl: process.env.VNP_RETURNURL, // URL sau khi thanh toán
  vnp_CurrCode: 'VND',
  vnp_Locale: 'vn',
};

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
}

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
    vnp_Amount: amount * 100, // VNPAY yêu cầu đơn vị là VND * 100
    vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const secureHash = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

  sortedParams.vnp_SecureHash = secureHash;
  const paymentUrl = `${vnpayConfig.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;

  return paymentUrl;
}

function verifyIpnQuery(query) {
  const vnp_Params = { ...query };
  const secureHash = vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHash;
  delete vnp_Params.vnp_SecureHashType;

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const checkHash = hmac.update(new Buffer.from(signData, 'utf-8')).digest('hex');

  return secureHash === checkHash;
}

module.exports = {
  generatePaymentUrl,
  verifyIpnQuery,
};
