import axios from 'axios';
import { generatePaymentUrl } from '../vnpay.js';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
  Version: '2021-07-28',
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

function extractInvoiceIdFromUrl(url) {
  const match = url.match(/invoice\\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount, orderId, contactId, ipAddr } = req.body;

    if (!amount || !contactId) {
      return res.status(400).json({ error: 'Thiếu amount hoặc contactId' });
    }

    // 🟢 Gọi GHL để tạo paymentLink
    const ghlRes = await axios.post(
      `${GHL_API_BASE}/payments/links/`,
      {
        amount,
        contactId,
        altId: GHL_LOCATION_ID,
        altType: 'location',
        description: `Thanh toán đơn hàng #${orderId}`,
        liveMode: true
      },
      { headers: GHL_HEADERS }
    );

    const paymentLink = ghlRes.data?.paymentLink;
    const invoiceId = extractInvoiceIdFromUrl(paymentLink);

    if (!invoiceId) {
      console.error('❌ Không tìm thấy invoiceId trong paymentLink:', paymentLink);
      return res.status(500).json({ error: 'Không tìm thấy invoiceId trong paymentLink' });
    }

    console.log('📦 Lấy invoiceId từ paymentLink:', invoiceId);

    // 🟢 Tạo paymentUrl VNPAY
    const paymentUrl = generatePaymentUrl({
      amount,
      orderInfo: invoiceId,
      ipAddr
    });

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error('❌ Lỗi create-payment-url:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Failed to create payment URL', details: err.message });
  }
}
