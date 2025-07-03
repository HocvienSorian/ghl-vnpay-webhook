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

function generatePaymentUrl({ amount, orderInfo, ipAddr, bankCode = '', orderType = 'other', locale = 'vn' }) {
  const config = getVnpConfig();

  // ✅ Đảm bảo GMT+7
  const date = new Date();
  date.setHours(date.getHours() + 7); // cộng thêm 7 tiếng để về giờ VN
  const createDate = date.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);

  const txnRef = date.getTime().toString().slice(-8);

  const vnp_Params = {
    vnp_Version: config.vnp_Version,
    vnp_Command: config.vnp_Command,
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Amount: amount * 100,
    vnp_CurrCode: config.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: encodeURIComponent(orderInfo), // ✅ giữ nguyên
    vnp_OrderType: orderType,
    vnp_Locale: locale,
    vnp_ReturnUrl: encodeURIComponent(config.vnp_ReturnUrl), // ✅ giữ nguyên
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) vnp_Params.vnp_BankCode = bankCode;

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });
  const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = secureHash;

  console.log('🧾 signData:', signData);
  console.log('🔐 secureHash:', secureHash);

  return `${config.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}

function verifyVnpResponse(queryParams) {
  const config = getVnpConfig();
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams;
  const sortedParams = sortObject(rest);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', config.vnp_HashSecret);
  const hash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('📥 VERIFY RESPONSE');
  console.log('↪️ signData:', signData);
  console.log('↪️ secureHash nhận được:', vnp_SecureHash);
  console.log('↪️ secureHash tính toán:', hash);

  return hash === vnp_SecureHash;
}

export { generatePaymentUrl, verifyVnpResponse, sortObject };
