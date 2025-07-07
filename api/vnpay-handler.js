// pages/api/vnpay-handler.js
import { verifyVnpResponse } from '../vnpay.js';
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }

  const { type, transactionId, chargeId, apiKey } = req.body;

  console.log('📥 Nhận verify từ GHL:', req.body);

  if (type !== 'verify' || !transactionId || !chargeId) {
    return res.status(400).json({ error: 'Thiếu tham số verify' });
  }

  try {
    // 📝 Giả lập kiểm tra trạng thái tại VNPAY
    const isValidPayment = true; // TODO: Gọi VNPAY QueryDR thực tế

    if (isValidPayment) {
      console.log('✅ Giao dịch VNPAY hợp lệ, trả success cho GHL');
      return res.status(200).json({ success: true });
    } else {
      console.warn('❌ Giao dịch VNPAY thất bại');
      return res.status(200).json({ failed: true });
    }
  } catch (err) {
    console.error('🔥 Lỗi khi xử lý verify:', err);
    return res.status(500).json({ error: 'Lỗi nội bộ' });
  }
}
