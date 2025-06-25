export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      message: '✅ VNPAY query handler is working',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method === 'POST') {
    const payload = req.body;
    console.log('📩 Nhận dữ liệu POST từ GHL:', payload);

    const { type } = payload;

    switch (type) {
      case 'verify': {
        const { transactionId, apiKey, chargeId, subscriptionId } = payload;

        // 👇 Tại đây bạn nên kiểm tra trạng thái thanh toán từ VNPAY nếu có.
        const isPaid = true; // bạn có thể thay bằng điều kiện kiểm tra từ DB hoặc webhook

        if (isPaid) {
          return res.status(200).json({ success: true }); // thông báo thành công
        } else {
          return res.status(200).json({ failed: true }); // thông báo thất bại
        }
      }

      case 'list_payment_methods': {
        const { contactId, locationId, apiKey } = payload;

        // 👇 Nếu bạn có lưu thông tin payment method thì trả về danh sách
        return res.status(200).json([
          {
            id: 'vnpay-method-123',
            type: 'card',
            title: 'VNPAY Card',
            subTitle: '****-****-1688',
            expiry: '12/28',
            customerId: 'vnpay-customer-001',
            imageUrl: 'https://vnpay.vn/logo.png'
          }
        ]);
      }

      case 'charge_payment': {
        const { paymentMethodId, amount, transactionId } = payload;

        // 👇 Bạn có thể gọi API đến VNPAY thật tại đây nếu cần
        const chargeId = `vnpay_charge_${Date.now()}`;

        return res.status(200).json({
          success: true,
          failed: false,
          chargeId,
          message: 'Thanh toán thành công từ paymentMethod',
          chargeSnapshot: {
            id: chargeId,
            status: 'succeeded',
            amount,
            chargeId,
            chargedAt: Math.floor(Date.now() / 1000)
          }
        });
      }

      default:
        return res.status(400).json({ error: 'Loại type không hỗ trợ' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
