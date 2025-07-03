// api/create-payment-url.js
import { generatePaymentUrl } from '../vnpay.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
  }

  const { amount, orderId, orderInfo, ipAddr } = req.body;

  if (!amount || !orderId || !orderInfo || !ipAddr) {
    console.warn('⚠️ Thiếu tham số:', { amount, orderId, orderInfo, ipAddr });
    return res.status(400).json({ error: 'Thiếu tham số bắt buộc' });
  }

  try {
    const paymentUrl = generatePaymentUrl({
      amount,
      orderInfo: `${orderInfo} - OrderID:${orderId}`,
      ipAddr,
    });

    console.log('✅ paymentUrl:', paymentUrl);
    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error('🔥 Lỗi khi tạo URL thanh toán:', err);
    return res.status(500).json({ error: 'Lỗi tạo URL thanh toán', detail: err.message });
  }
}
