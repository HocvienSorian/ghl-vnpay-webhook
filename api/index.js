// index.js
import { verifyVnpResponse } from '../vnpay.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Chỉ hỗ trợ GET hoặc POST' });
  }

  try {
    const queryParams = { ...req.query };
    if (!queryParams.vnp_SecureHash) {
      return res.status(400).json({ error: 'Thiếu tham số vnp_SecureHash' });
    }

    const isValid = verifyVnpResponse(queryParams);
    if (!isValid) {
      console.warn('❌ Checksum không hợp lệ:', queryParams);
      return res.status(400).json({ error: '❌ Checksum không hợp lệ' });
    }

    console.log('✅ Checksum hợp lệ cho callback');
    return res.status(200).json({ message: '✅ Đã xử lý thành công VNPAY callback' });
  } catch (err) {
    console.error('❌ Lỗi xử lý callback:', err);
    return res.status(500).json({ error: 'Lỗi xử lý callback', detail: err.message });
  }
}

