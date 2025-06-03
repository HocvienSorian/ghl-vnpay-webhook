import { generatePaymentUrl } from '../../vnpay.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { amount, orderId, orderInfo, ipAddr } = req.body;

  if (!amount || !orderId || !orderInfo || !ipAddr) {
    return res.status(400).json({ error: 'Thiếu tham số bắt buộc' });
  }

  const paymentUrl = generatePaymentUrl({ amount, orderId, orderInfo, ipAddr });

  return res.status(200).json({ paymentUrl });
}
