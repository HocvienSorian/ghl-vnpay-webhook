import { generatePaymentUrl } from '../vnpay.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { amount, orderInfo, ipAddr } = req.body;
  console.log("📥 Creating Payment URL for:", req.body);

  try {
    const paymentUrl = generatePaymentUrl({ amount, orderInfo, ipAddr });
    console.log("✅ Payment URL:", paymentUrl);
    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error("🔥 Error creating payment URL:", err.message);
    return res.status(500).json({ error: 'Failed to create payment URL', details: err.message });
  }
}
