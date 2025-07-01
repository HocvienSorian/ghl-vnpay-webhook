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

function formatDateVN(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localTime = new Date(date.getTime() - tzOffset + 7 * 60 * 60 * 1000); // GMT+7
  return localTime.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
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

export function generatePaymentUrl({ amount, bankCode = '', orderInfo, orderType = 'other', locale = 'vn', ipAddr, orderId }) {
  const vnpayConfig = getVnpConfig();
  const createDate = formatDateVN();

  const sanitizedOrderInfo = orderInfo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu
    .replace(/[^\w\s]/gi, "")        // bỏ ký tự đặc biệt
    .replace(/\s+/g, ' ')            // bỏ khoảng trắng thừa

  const vnp_Params = {
    vnp_Version: vnpayConfig.vnp_Version,
    vnp_Command: vnpayConfig.vnp_Command,
    vnp_TmnCode: vnpayConfig.vnp_TmnCode,
    vnp_Locale: locale,
    vnp_CurrCode: vnpayConfig.vnp_CurrCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: sanitizedOrderInfo,
    vnp_OrderType: orderType,
    vnp_Amount: Math.round(Number(amount)) * 100,
    vnp_ReturnUrl: vnpayConfig.vnp_ReturnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  if (bankCode) {
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  sortedParams.vnp_SecureHash = secureHash;

  return `${vnpayConfig.vnp_Url}?${qs.stringify(sortedParams, { encode: false })}`;
}
