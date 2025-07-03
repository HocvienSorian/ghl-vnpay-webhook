// pages/api/vnpay-handler.js
import { verifyVnpResponse } from '../vnpay.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ GET' });
  }

  const queryParams = req.query;
  console.log('📥 VNPAY callback queryParams:', queryParams);

  try {
    const isValid = verifyVnpResponse(queryParams);
    if (!isValid) {
      console.warn('❌ Checksum không hợp lệ');
      return res.status(400).json({ RspCode: '97', Message: 'Invalid Checksum' });
    }

    console.log('✅ Checksum hợp lệ. Đang xử lý đơn hàng...');
    // TODO: Xử lý đơn hàng tại đây
    return res.status(200).json({ RspCode: '00', Message: 'Success' });
  } catch (err) {
    console.error('❌ Lỗi xử lý callback:', err);
    return res.status(500).json({ RspCode: '99', Message: 'Unknown Error' });
  }
}
