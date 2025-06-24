import { generatePaymentUrl } from '../../vnpay.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
  }

  const { amount, orderId, orderInfo, ipAddr } = req.body;

  if (!amount || !orderId || !orderInfo || !ipAddr) {
    return res.status(400).json({ error: 'Thiếu tham số bắt buộc' });
  }

  try {
    // ✅ DEBUG: kiểm tra biến môi trường có tồn tại không
    if (!process.env.VNP_HASHSECRET || !process.env.VNP_TMNCODE || !process.env.VNP_URL) {
      console.error('❌ ENV thiếu hoặc chưa được load');
      return res.status(500).json({ error: 'Thiếu biến môi trường cấu hình VNPAY' });
    }

    // ✅ Gọi hàm tạo URL
    const paymentUrl = generatePaymentUrl({ amount, orderId, orderInfo, ipAddr });

    // ✅ In log URL đã tạo để kiểm tra chữ ký
    console.log('>>> ✅ Generated paymentUrl:', paymentUrl);

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    // ✅ Log chi tiết lỗi
    console.error('🔥 Lỗi khi tạo URL thanh toán:', err);
    return res.status(500).json({ error: 'Lỗi nội bộ khi tạo URL thanh toán', detail: err.message });
  }
}
