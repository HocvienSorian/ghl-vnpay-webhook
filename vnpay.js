// vnpay.js
import crypto from 'crypto';
function sortObject(obj) {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = obj[key];
  });
  return sorted;
}
function getVnpConfig() {
  const cleanEnv = val => val.replace(/^\uFEFF/, '').trim();
  const envs = ['VNP_TMNCODE', 'VNP_HASHSECRET', 'VNP_URL', 'VNP_RETURNURL'];
  const missing = envs.filter(k => !process.env[k]);
  if (missing.length > 0) throw new Error(`❌ Missing env: ${missing.join(', ')}`);
  return {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: cleanEnv(process.env.VNP_TMNCODE),
    vnp_HashSecret: cleanEnv(process.env.VNP_HASHSECRET),
    vnp_Url: cleanEnv(process.env.VNP_URL),
    vnp_ReturnUrl: cleanEnv(process.env.VNP_RETURNURL),
    vnp_CurrCode: 'VND',
    vnp_Locale: 'vn'
  };
}
function generatePaymentUrl({ amount, orderInfo, ipAddr }) {
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
    vnp_Amount: Math.round(amount * 100),
    vnp_CurrCode: cfg.vnp_CurrCode,
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: 'other',
    vnp_Locale: cfg.vnp_Locale,
    vnp_ReturnUrl: cfg.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
    vnp_ExpireDate: expireDate
  };
  const sortedParams = sortObject(vnp_Params);
  // ✅ Encode value khi hash để test Sandbox
  const signData = Object.keys(sortedParams).map(k =>
    `${k}=${encodeURIComponent(sortedParams[k])}`
  ).join('&');
  const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
  const secureHash = hmac.update(signData, 'utf-8').digest('hex');
  sortedParams.vnp_SecureHash = secureHash;
  const queryString = Object.keys(sortedParams).map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent(sortedParams[k])}`
  ).join('&');
  return `${cfg.vnp_Url}?${queryString}`;
}
function verifyVnpResponse(queryParams) {
  const cfg = getVnpConfig();
  const params = { ...queryParams };
  delete params.vnp_SecureHash;
  delete params.vnp_SecureHashType;
  const sortedParams = sortObject(params);
  const signData = Object.keys(sortedParams).map(k =>
    `${k}=${encodeURIComponent(sortedParams[k])}`
  ).join('&');
  const hmac = crypto.createHmac('sha512', cfg.vnp_HashSecret);
  const hash = hmac.update(signData, 'utf-8').digest('hex');
  return hash === queryParams.vnp_SecureHash;
}
export { generatePaymentUrl, verifyVnpResponse, sortObject };
