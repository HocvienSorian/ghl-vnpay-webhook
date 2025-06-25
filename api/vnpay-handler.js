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
        console.log('📥 VERIFY CALL:', payload);

        // ✅ Tạm xác nhận thành công nếu chargeId bắt đầu bằng "vnpay"
        const isPaid = chargeId?.startsWith('vnpay');

        if (isPaid) {
          return res.status(200).json({ success: true });
        } else {
          return res.status(200).json({ failed: true });
        }
      }

      case 'list_payment_methods': {
        const { contactId, locationId, apiKey } = payload;

        if (!contactId) {
          console.warn('⚠️ Thiếu contactId từ GHL → không trả về payment method');
          return res.status(400).json({ error: 'Thiếu contactId' });
        }

        console.log('📥 list_payment_methods payload:', payload);

        const paymentMethods = [
          {
            id: `vnpay-method-${contactId}`, // Tùy biến cho từng user
            type: 'card',
            title: 'VNPay',
            subTitle: 'QR/Ví điện tử',
            expiry: '12/29',
            customerId: contactId, // BẮT BUỘC PHẢI CÓ!
            imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/VNPAY_logo.png'
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

        if (!contactId || !transactionId || !amount) {
          return res.status(400).json({ error: 'Thiếu thông tin giao dịch' });
        }

        console.log('📥 charge_payment:', {
          paymentMethodId,
          transactionId,
          contactId,
          amount,
          currency
        });

        const chargeId = `vnpay_charge_${Date.now()}`;

        return res.status(200).json({
          success: true,
          failed: false,
          chargeId,
          message: '💳 Giao dịch thành công qua VNPay (demo)',
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
