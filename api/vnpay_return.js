// pages/api/vnpay_return.js

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

function verifyVnpSignature(vnpParams, secretKey) {
  const secureHash = vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  const signData = qs.stringify(sortObject(vnpParams), { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  return signed === secureHash;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }

  const data = req.body;

  if (!data.vnp_SecureHash) {
    return res.status(400).json({ message: 'Thiếu chữ ký vnp_SecureHash' });
  }

  const isValid = verifyVnpSignature({ ...data }, process.env.VNP_HASHSECRET);

  if (!isValid) {
    return res.status(400).json({ message: '❌ Chữ ký không hợp lệ' });
  }

  if (data.vnp_ResponseCode !== '00') {
    return res.status(200).json({ message: '❌ Giao dịch không thành công' });
  }

  return res.status(200).json({
    message: `✅ Giao dịch thành công. Đơn hàng: ${data.vnp_TxnRef}, Số tiền: ${parseInt(data.vnp_Amount) / 100} VND`
  });
}
