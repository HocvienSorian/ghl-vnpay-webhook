export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      message: '✅ VNPAY query handler is working',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    const payload = req.body;

    // 👉 Bạn có thể xử lý thông tin giao dịch VNPAY tại đây
    console.log('📩 Nhận dữ liệu POST từ GHL:', payload);

    return res.status(200).json({
      message: '✅ Đã nhận dữ liệu VNPAY',
      received: payload
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
