// pages/api/create-payment-url.js
import { generatePaymentUrl } from '../vnpay.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
  }

  const { amount, orderId, orderInfo, ipAddr } = req.body;

  if (!amount || !orderId || !orderInfo || !ipAddr) {
    console.warn('⚠ Thiếu tham số:', { amount, orderId, orderInfo, ipAddr });
    return res.status(400).json({ error: 'Thiếu tham số bắt buộc' });
  }

  try {
    const requiredEnvs = ['VNP_HASHSECRET', 'VNP_TMNCODE', 'VNP_URL', 'VNP_RETURNURL'];
    const missing = requiredEnvs.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error('❌ Thiếu biến môi trường VNPAY:', missing);
      return res.status(500).json({ error: 'Thiếu cấu hình môi trường VNPAY', missing });
    }

    const paymentUrl = generatePaymentUrl({ amount, orderId, orderInfo, ipAddr });

    // ⚠️ Rất quan trọng để debug sai chữ ký
    console.log('📌 DEBUG:');
    console.log('   ↪️ Order ID:', orderId);
    console.log('   💬 Order Info:', orderInfo);
    console.log('   💰 Amount:', amount);
    console.log('   🌐 IP:', ipAddr);
    console.log('>>> ✅ Generated paymentUrl:', paymentUrl);

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error('🔥 Lỗi khi tạo URL thanh toán:', err);

    return res.status(500).json({
      error: 'Lỗi nội bộ khi tạo URL thanh toán',
      detail: err.message,
      suggestion: '❗Hãy kiểm tra encode vnp_OrderInfo, vnp_ReturnUrl và cấu hình hash secret',
    });
  }
}
