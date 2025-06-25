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

        // 🧠 TODO: Kiểm tra trạng thái thanh toán từ VNPAY thật nếu cần
        const isPaid = true;

        if (isPaid) {
          return res.status(200).json({ success: true });
        } else {
          return res.status(200).json({ failed: true });
        }
      }

      case 'list_payment_methods': {
        const { contactId, locationId, apiKey } = payload;

        // 🧠 TODO: Nếu có lưu DB thì truy vấn thật ở đây
        const paymentMethods = [
          {
            id: 'vnpay-method-123',
            type: 'card',
            title: 'VNPAY',
            subTitle: '****6868',
            expiry: '12/29',
            customerId: contactId,
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

        // 🧠 TODO: Gọi API thanh toán VNPAY thật nếu cần

        const chargeId = `vnpay_charge_${Date.now()}`;

        return res.status(200).json({
          success: true,
          failed: false,
          chargeId,
          message: '💳 Giao dịch thành công từ VNPAY',
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
