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
  console.log("📥 [Handler] GHL hoặc Frontend gọi backend");
  console.log("Method:", req.method);
  console.log("Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    console.warn("⚠️ [Handler] Method không hỗ trợ:", req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, transactionId, chargeId, locationId, amount } = req.body;
 
  // 🆕 Xử lý type: "list_payment_methods"
  if (type === 'list_payment_methods') {
    console.log("📥 [Handler] Nhận yêu cầu list_payment_methods từ GHL");

    // Trả về 1 phương thức VNPAY mặc định
    const paymentMethods = [
      {
        id: "vnpay", // ID sẽ được dùng để charge
        type: "custom", // Hoặc "bank_account" nếu muốn
        title: "VNPAY",
        subTitle: "One-time Payment",
        expiry: "", // VNPAY không có expiry
        customerId: contactId, // Liên kết với Contact trên GHL
        imageUrl: "https://vnpay-webhook.vercel.app/logo.png" // URL icon VNPAY
      }
    ];

    console.log("✅ [Handler] Trả danh sách payment_methods:", JSON.stringify(paymentMethods, null, 2));
    return res.status(200).json(paymentMethods);
  }
 
  // 🆕 Xử lý type: "send_webhook" từ frontend
  if (type === 'send_webhook') {
    console.log("📥 [Handler] Nhận yêu cầu send_webhook từ frontend:");
    try {
      await sendPaymentCapturedWebhook({
        chargeId,
        ghlTransactionId: transactionId,
        amount,
        locationId
      });
      return res.status(200).json({ success: true, message: "✅ Đã gửi webhook đến GHL" });
    } catch (err) {
      console.error("🔥 Lỗi khi gửi webhook từ send_webhook:", err.message);
      return res.status(500).json({ success: false, error: 'Lỗi khi gửi webhook đến GHL' });
    }
  }

  // 🔄 Xử lý verify từ GHL queryUrl
  if (type === 'verify') {
    if (!transactionId || !chargeId || !locationId) {
      console.error("❌ [Handler] Thiếu tham số verify trong payload:");
      return res.status(400).json({ error: 'Thiếu tham số verify' });
    }

    console.log("🔍 [Handler] Đang xác minh giao dịch VNPAY...");
    const isValidPayment = true; // TODO: Replace với VNPAY QueryDR call

    if (isValidPayment) {
      console.log("✅ [Handler] Giao dịch VNPAY hợp lệ. Đang gửi webhook...");
      try {
        await sendPaymentCapturedWebhook({
          chargeId,
          ghlTransactionId: transactionId,
          amount,
          locationId
        });
        return res.status(200).json({ success: true });
      } catch (err) {
        console.error("🔥 Lỗi khi gửi webhook từ verify:", err.message);
        return res.status(500).json({ error: 'Lỗi khi gửi webhook đến GHL' });
      }
    } else {
      console.warn("⚠️ [Handler] Giao dịch VNPAY không hợp lệ");
      return res.status(200).json({ failed: true });
    }
  }

  console.warn("⚠️ [Handler] Unknown type:", type);
  return res.status(400).json({ error: 'Unknown type' });
}
