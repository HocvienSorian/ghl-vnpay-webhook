import crypto from 'crypto';
import qs from 'qs';

function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = obj[key];
      return acc;
    }, {});
}

// ✅ Moved config creation into function
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

function generatePaymentUrl({ amount, bankCode = '', orderInfo, orderType = 'other', locale = 'vn', ipAddr }) {
  const vnpayConfig = getVnpConfig();

  const date = new Date();
  const createDate = date.toISOString().replace(/[-T:Z.]/g, '').slice(0, 14);
  const orderId = date.toTimeString().slice(0, 8).replace(/:/g, ''); // HHmmss

  const vnp_Params = {
    vnp_Version: vnpayConfig.vnp_Version,
    vnp_Command: vnpayConfig.vnp_Command,
    vnp_TmnCode: vnpayConfig.vnp_TmnCode,
    vnp_Locale: locale || 'vn',
    vnp_CurrCode: vnpayConfig.vnp_CurrCode,
    vnp_TxnRef: orderId,
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,
    vnp_Amount: amount * 100,
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

function verifyVnpResponse(queryParams) {
  const vnpayConfig = getVnpConfig();
  const { vnp_SecureHash, vnp_SecureHashType, ...restParams } = queryParams;
  const sortedParams = sortObject(restParams);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', vnpayConfig.vnp_HashSecret);
  const hash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return hash === vnp_SecureHash;
}

export {
  generatePaymentUrl,
  verifyVnpResponse,
  sortObject,
};
