// index.js
import { verifyVnpResponse } from '../vnpay.js';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Chỉ hỗ trợ GET hoặc POST' });
  }

  try {
    const queryParams = { ...req.query };
    const vnp_SecureHash = queryParams.vnp_SecureHash;

    if (!vnp_SecureHash) {
      return res.status(400).json({ error: 'Thiếu tham số vnp_SecureHash' });
    }

    const isValid = verifyVnpResponse(queryParams);
    console.log('✅ Checksum hợp lệ?', isValid);

    if (!isValid) {
      return res.status(400).json({ error: 'Checksum không hợp lệ' });
    }

    return res.status(200).json({ message: '✅ Checksum hợp lệ' });
  } catch (error) {
    console.error('❌ Lỗi xử lý webhook:', error);
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
