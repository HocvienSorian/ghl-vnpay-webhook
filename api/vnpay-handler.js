export default async function handler(req, res) {
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

        // ✅ Giả lập kiểm tra thanh toán (có thể thay bằng logic DB/webhook thật)
        const isPaid = true;

        if (isPaid) {
          return res.status(200).json({ success: true });
        } else {
          return res.status(200).json({ failed: true });
        }
      }

      case 'list_payment_methods': {
        const { contactId, locationId, apiKey } = payload;

        // ✅ Trả về ít nhất 1 phương thức thanh toán hợp lệ
        const paymentMethods = [
          {
            id: 'vnpay-method-6868',
            type: 'card',
            title: 'VNPAY',
            subTitle: '**** 6868',
            expiry: '12/29',
            customerId: contactId, // BẮT BUỘC PHẢI CÓ!
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png'
          }
        ];

        return res.status(200).json(paymentMethods);
      }

      case 'charge_payment': {
        const {
          paymentMethodId,
          contactId,
          transactionId,
          chargeDescription,
          amount,
          currency,
          apiKey
        } = payload;

        // ✅ Giả lập mã giao dịch, bạn có thể gọi API thực tế của VNPAY tại đây
        const chargeId = `vnpay_charge_${Date.now()}`;

        return res.status(200).json({
          success: true,
          failed: false,
          chargeId,
          message: '💳 Giao dịch thành công qua VNPAY',
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
        return res.status(400).json({ error: `❌ Unsupported type: ${type}` });
    }
  }

  return res.status(405).json({ error: '❌ Method not allowed' });
}
