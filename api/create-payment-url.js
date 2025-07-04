import { generatePaymentUrl } from '../vnpay.js';

// 🟢 Extract invoiceId từ paymentLink
function extractInvoiceIdFromUrl(url) {
  const match = url.match(/invoice\/([a-f0-9]{24})/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
  }

  const { amount, paymentLink, ipAddr } = req.body;

  if (!amount || !paymentLink || !ipAddr) {
    console.warn('⚠ Thiếu tham số:', { amount, paymentLink, ipAddr });
    return res.status(400).json({ error: 'Thiếu amount, paymentLink hoặc ipAddr' });
  }

  try {
    const requiredEnvs = ['VNP_HASHSECRET', 'VNP_TMNCODE', 'VNP_URL', 'VNP_RETURNURL'];
    const missing = requiredEnvs.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error('❌ Thiếu biến môi trường VNPAY:', missing);
      return res.status(500).json({ error: 'Thiếu cấu hình môi trường VNPAY', missing });
    }

    const invoiceId = extractInvoiceIdFromUrl(paymentLink);
    if (!invoiceId) {
      console.error('❌ Không tìm thấy invoiceId trong paymentLink:', paymentLink);
      return res.status(500).json({ error: 'Không tìm thấy invoiceId trong paymentLink' });
    }

    console.log('📦 Extracted invoiceId =', invoiceId);

    const paymentUrl = generatePaymentUrl({
      amount,
      orderInfo: invoiceId,
      ipAddr
    });

    console.log('✅ Generated paymentUrl:', paymentUrl);

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error('🔥 Lỗi khi tạo paymentUrl:', err.message);
    return res.status(500).json({
      error: 'Lỗi tạo paymentUrl',
      detail: err.message
    });
  }
}
