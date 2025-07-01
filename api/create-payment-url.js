// pages/api/create-payment-url.js
import { generatePaymentUrl } from '../vnpay';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }

  const { amount, orderId, orderInfo, ipAddr, bankCode, orderType, locale } = req.body;

  if (!amount || !orderId || !orderInfo || !ipAddr) {
    return res.status(400).json({ error: 'Thiếu tham số bắt buộc' });
  }

  try {
    const paymentUrl = generatePaymentUrl({
      amount,
      orderId,
      orderInfo,
      ipAddr,
      bankCode,
      orderType: orderType || 'other',
      locale: locale || 'vn',
    });

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error('🔥 Lỗi tạo URL:', err);
    return res.status(500).json({ error: 'Lỗi tạo URL', detail: err.message });
  }
}
