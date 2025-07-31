// pages/api/vnpay-handler.js
import axios from 'axios';

const GHL_WEBHOOK_URL = "https://backend.leadconnectorhq.com/payments/custom-provider/webhook";
const PRIVATE_PROVIDER_API_KEY = process.env.GHL_PRIVATE_PROVIDER_API_KEY;

async function sendPaymentCapturedWebhook({ chargeId, ghlTransactionId, amount, locationId }) {
  if (!PRIVATE_PROVIDER_API_KEY) {
    console.error("🚨 PRIVATE_PROVIDER_API_KEY missing in .env");
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

  console.log("📦 Webhook Payload:", JSON.stringify(payload, null, 2));

  const res = await axios.post(GHL_WEBHOOK_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 7000
  });

  console.log("✅ Webhook sent. Status:", res.status, "Response:", res.data);
  return res.data;
}

async function createVnpayPaymentUrl({ amount, orderId, orderInfo }) {
  console.log("🔗 Creating VNPAY payment URL...");
  // Mock only – replace with your actual payment URL logic
  const paymentUrl = `https://sandbox.vnpayment.vn/vpcpay.html?amount=${amount}&orderId=${orderId}&info=${orderInfo}`;
  return paymentUrl;
}

export default async function handler(req, res) {
  console.log("📥 API called");
  console.log("➡️ Method:", req.method);
  console.log("➡️ Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, transactionId, chargeId, locationId, amount, contactId, apiKey } = req.body;

  // 🔹 Xác thực apiKey
  if (!apiKey || apiKey !== PRIVATE_PROVIDER_API_KEY) {
    console.warn("❌ Invalid or missing apiKey:", apiKey);
    return res.status(403).json({ error: 'Invalid API key for custom provider' });
  }

  // 1️⃣ List Payment Methods
  if (type === 'list_payment_methods') {
    console.log("🟢 Handling list_payment_methods");

    const paymentMethods = [
      {
        id: "vnpay",
        type: "custom",
        title: "VNPAY",
        subTitle: "Thanh toán qua VNPAY",
        imageUrl: "https://vnpay-webhook.vercel.app/logo.png",
        customerId: contactId
      }
    ];

    return res.status(200).json(paymentMethods);
  }

  // 2️⃣ Charge Payment
  if (type === 'charge_payment_method') {
    console.log("🟠 Handling charge_payment_method");

    try {
      const paymentUrl = await createVnpayPaymentUrl({
        amount,
        orderId: transactionId,
        orderInfo: contactId
      });
      return res.status(200).json({ paymentUrl });
    } catch (err) {
      console.error("🔥 Failed to create payment URL:", err.message);
      return res.status(500).json({ error: 'Failed to create paymentUrl' });
    }
  }

  // 3️⃣ Send Webhook manually (fallback)
  if (type === 'send_webhook') {
    console.log("📨 Handling send_webhook");

    try {
      await sendPaymentCapturedWebhook({
        chargeId,
        ghlTransactionId: transactionId,
        amount,
        locationId
      });
      return res.status(200).json({ success: true, message: "Webhook sent to GHL" });
    } catch (err) {
      console.error("🔥 Webhook sending failed:", err.message);
      return res.status(500).json({ error: 'Failed to send webhook' });
    }
  }

  // 4️⃣ Verify (used by GHL post-payment)
  if (type === 'verify') {
    console.log("🔍 Handling verify");

    if (!transactionId || !chargeId || !locationId) {
      return res.status(400).json({ error: 'Missing verify parameters' });
    }

    const isValidPayment = true; // Replace with actual VNPAY query logic
    if (isValidPayment) {
      try {
        await sendPaymentCapturedWebhook({
          chargeId,
          ghlTransactionId: transactionId,
          amount,
          locationId
        });
        return res.status(200).json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: 'Failed to send webhook in verify' });
      }
    } else {
      return res.status(200).json({ failed: true });
    }
  }

  // ❓ Unknown
  console.warn("⚠️ Unknown request type:", type);
  return res.status(400).json({ error: 'Unknown request type' });
}
