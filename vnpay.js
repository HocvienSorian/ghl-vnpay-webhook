import crypto from 'crypto';
import qs from 'qs';

// 🔥 Sort object keys alphabetically
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

// 🔥 Load VNPAY config from env
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
    vnp_ReturnUrl: encodeURIComponent(process.env.VNP_RETURNURL), // ✅ encode trước khi ký
    vnp_CurrCode: 'VND',
    vnp_Locale: 'vn',
  };
}

// 🔥 Generate VNPAY payment URL
function generatePaymentUrl({
  amount,
  orderInfo,
  ipAddr,
  bankCode = '',
  orderType = 'other',
  locale = 'vn',
}) {
  const config = getVnpConfig();
  const date = new Date();
  const createDate = date.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const txnRef = date.getTime().toString().slice(-8);

  const vnp_Params = {
    vnp_Version: config.vnp_Version,
    vnp_Command: config.vnp_Command,
    vnp_TmnCode: config.vnp_TmnCode,
    vnp_Amount: amount * 100,
    vnp_CurrCode: config.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Locale: locale,
    vnp_ReturnUrl: config.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) {
    vnp_Params.vnp_BankCode = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASHSECRET);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = secureHash;

  console.log('📦 Params:', sortedParams);
  console.log('🧾 signData:', signData);
  console.log('🔐 secureHash:', secureHash);

  return `${process.env.VNP_URL}?${qs.stringify(sortedParams, { encode: false })}`;
}

// 🔥 Verify VNPAY response hash
function verifyVnpResponse(queryParams) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryParams;
  const sortedParams = sortObject(rest);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASHSECRET);
  const hash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('📥 VERIFY RESPONSE:');
  console.log('↪️ signData:', signData);
  console.log('↪️ secureHash nhận được:', vnp_SecureHash);
  console.log('↪️ secureHash tính toán:', hash);
  console.log('✅ Checksum hợp lệ?', hash === vnp_SecureHash);

  return hash === vnp_SecureHash;
}

export { generatePaymentUrl, verifyVnpResponse, sortObject };
