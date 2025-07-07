// pages/api/vnpay-handler.js
import axios from 'axios';
import { verifyVnpResponse } from '../vnpay.js';

const GHL_WEBHOOK_URL = "https://backend.leadconnectorhq.com/payments/custom-provider/webhook";
const PRIVATE_PROVIDER_API_KEY = process.env.GHL_PRIVATE_PROVIDER_API_KEY;

async function sendPaymentCapturedWebhook({ chargeId, ghlTransactionId, amount, locationId }) {
  if (!PRIVATE_PROVIDER_API_KEY) {
    console.error("🚨 PRIVATE_PROVIDER_API_KEY không tồn tại. Check .env file!");
    throw new Error("PRIVATE_PROVIDER_API_KEY missing");
  }

  const payload = {
    event: "payment.captured",
    chargeId,
    ghlTransactionId,
    chargeSnapshot: {
      status: "succeeded",
      amount: amount || 0, // fallback nếu amount undefined
      chargeId,
      chargedAt: Math.floor(Date.now() / 1000)
    },
    locationId,
    apiKey: PRIVATE_PROVIDER_API_KEY
  };

  console.log("📦 [Webhook] Payload gửi đến GHL:");
  console.log(JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(GHL_WEBHOOK_URL, payload, {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 7000
    });

    console.log("✅ [Webhook] Gửi thành công:");
    console.log("Status:", res.status);
    console.log("Data:", JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err) {
    console.error("❌ [Webhook] Lỗi gửi đến GHL:");
    console.error("Status:", err.response?.status);
    console.error("Data:", JSON.stringify(err.response?.data, null, 2));
    console.error("Headers:", JSON.stringify(err.response?.headers, null, 2));
    console.error("Config:", JSON.stringify(err.config, null, 2));
    throw err;
  }
}

export default async function handler(req, res) {
  console.log("📥 [Handler] GHL gọi queryUrl");
  console.log("Method:", req.method);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    console.warn("⚠️ [Handler] Method không được hỗ trợ:", req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, transactionId, chargeId, locationId, amount } = req.body;

  if (type !== 'verify' || !transactionId || !chargeId || !locationId) {
    console.error("❌ [Handler] Thiếu tham số bắt buộc trong payload:");
    console.error(JSON.stringify(req.body, null, 2));
    return res.status(400).json({ error: 'Thiếu tham số verify' });
  }

  try {
    // 📝 Bước 1: Xác minh giao dịch VNPAY (giả lập)
    console.log("🔍 [Handler] Đang xác minh giao dịch VNPAY...");
    const isValidPayment = true; // TODO: Thay bằng call QueryDR thực tế

    if (isValidPayment) {
      console.log("✅ [Handler] Giao dịch VNPAY hợp lệ. Đang gửi webhook...");
      await sendPaymentCapturedWebhook({
        chargeId,
        ghlTransactionId: transactionId,
        amount,
        locationId
      });

      console.log("📤 [Handler] Trả success về GHL");
      return res.status(200).json({ success: true });
    } else {
      console.warn("⚠️ [Handler] Giao dịch VNPAY không hợp lệ. Trả failed.");
      return res.status(200).json({ failed: true });
    }
  } catch (err) {
    console.error("🔥 [Handler] Lỗi xử lý verify:");
    console.error(err.stack || err.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
