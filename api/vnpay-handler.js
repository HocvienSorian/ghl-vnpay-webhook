// pages/api/vnpay-handler.js
import axios from 'axios';
import { verifyVnpResponse } from '../vnpay.js';

const GHL_WEBHOOK_URL = "https://backend.leadconnectorhq.com/payments/custom-provider/webhook";
const PRIVATE_PROVIDER_API_KEY = process.env.GHL_PRIVATE_PROVIDER_API_KEY;

async function sendPaymentCapturedWebhook({ chargeId, ghlTransactionId, amount, locationId }) {
  const payload = {
    event: "payment.captured",
    chargeId,
    ghlTransactionId,
    chargeSnapshot: {
      status: "succeeded",
      amount,
      chargeId,
      chargedAt: Math.floor(Date.now() / 1000)
    },
    locationId,
    apiKey: PRIVATE_PROVIDER_API_KEY
  };

  try {
    const res = await axios.post(GHL_WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    console.log("✅ Đã gửi webhook payment.captured tới GHL:", res.data);
  } catch (err) {
    console.error("❌ Lỗi gửi webhook tới GHL:", err.response?.data || err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, transactionId, chargeId, locationId, amount } = req.body;

  console.log("📥 Nhận yêu cầu verify từ GHL:", req.body);

  if (type !== 'verify' || !transactionId || !chargeId || !locationId) {
    return res.status(400).json({ error: 'Thiếu tham số verify' });
  }

  try {
    // 📝 Bước 1: Xác minh giao dịch VNPAY (giả lập)
    const isValidPayment = true; // TODO: Thay bằng call QueryDR thực tế

    if (isValidPayment) {
      console.log("✅ Giao dịch VNPAY hợp lệ, gửi webhook tới GHL...");
      await sendPaymentCapturedWebhook({ chargeId, ghlTransactionId: transactionId, amount, locationId });

      console.log("✅ Trả success cho GHL");
      return res.status(200).json({ success: true });
    } else {
      console.warn("❌ Giao dịch VNPAY không hợp lệ");
      return res.status(200).json({ failed: true });
    }
  } catch (err) {
    console.error("🔥 Lỗi khi verify giao dịch:", err.response?.data || err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
