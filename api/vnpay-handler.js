// pages/api/vnpay-handler.js
import axios from 'axios';

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
      amount: amount || 0,
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
      headers: { "Content-Type": "application/json" },
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
    throw err;
  }
}

export default async function handler(req, res) {
  console.log("📥 [Handler] VNPAY ReturnUrl/IPN gọi backend");
  console.log("Method:", req.method);
  console.log("Query params:", JSON.stringify(req.query, null, 2));

  const vnp_ResponseCode = req.query.vnp_ResponseCode;
  const vnp_TransactionNo = req.query.vnp_TransactionNo;
  const vnp_TxnRef = req.query.vnp_TxnRef;

  if (!vnp_ResponseCode || !vnp_TransactionNo || !vnp_TxnRef) {
    console.error("❌ Thiếu tham số từ VNPAY");
    return res.status(400).send("❌ Thiếu tham số từ VNPAY");
  }

  if (vnp_ResponseCode === '00') {
    console.log("✅ Giao dịch VNPAY thành công. Đang gửi webhook đến GHL...");
    try {
      await sendPaymentCapturedWebhook({
        chargeId: vnp_TransactionNo,
        ghlTransactionId: vnp_TxnRef,
        amount: 100000, // 🎯 Lấy từ DB hoặc fallback
        locationId: "adLYHnkHxGxHU7ofn3RN" // 🎯 Lấy từ DB hoặc fallback
      });
      return res.status(200).send("✅ Đã gửi webhook GHL");
    } catch (err) {
      console.error("🔥 Lỗi khi gửi webhook:", err.message);
      return res.status(500).send("❌ Lỗi khi gửi webhook");
    }
  } else {
    console.warn("⚠️ Giao dịch VNPAY thất bại:", vnp_ResponseCode);
    return res.status(200).send("⚠️ Giao dịch thất bại");
  }
}
