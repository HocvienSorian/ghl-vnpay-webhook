import { generatePaymentUrl } from '../vnpay.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
  }

  const { amount, orderId, orderInfo, ipAddr } = req.body;

  if (!amount || !orderId || !orderInfo || !ipAddr) {
    return res.status(400).json({ error: 'Thiếu tham số bắt buộc' });
  }

  try {
    if (!process.env.VNP_HASHSECRET || !process.env.VNP_TMNCODE || !process.env.VNP_URL) {
      console.error('❌ ENV thiếu hoặc chưa được load');
      return res.status(500).json({ error: 'Thiếu biến môi trường cấu hình VNPAY' });
    }

    const paymentUrl = generatePaymentUrl({ amount, orderId, orderInfo, ipAddr });

    console.log('>>> ✅ Generated paymentUrl:', paymentUrl);

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error('🔥 Lỗi khi tạo URL thanh toán:', err);
    return res.status(500).json({ error: 'Lỗi nội bộ khi tạo URL thanh toán', detail: err.message });
  }
}
