// pages/api/vnpay-handler.js
import axios from 'axios';

const GHL_WEBHOOK_URL = "https://backend.leadconnectorhq.com/payments/custom-provider/webhook";
const PRIVATE_PROVIDER_API_KEY = process.env.GHL_PRIVATE_PROVIDER_API_KEY;

async function sendPaymentCapturedWebhook({ chargeId, ghlTransactionId, amount, locationId }) {
  if (!PRIVATE_PROVIDER_API_KEY) {
    console.error("🚨 [vnpay-handler] PRIVATE_PROVIDER_API_KEY missing. Check .env");
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

  console.log("📦 [vnpay-handler] Webhook Payload:", JSON.stringify(payload, null, 2));

  try {
    const res = await axios.post(GHL_WEBHOOK_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 7000
    });
    console.log("✅ [vnpay-handler] Webhook sent. Status:", res.status, "Data:", JSON.stringify(res.data, null, 2));
    return res.data;
  } catch (err) {
    console.error("❌ [vnpay-handler] Webhook error:", err.response?.status, JSON.stringify(err.response?.data, null, 2));
    throw err;
  }
}

async function createVnpayPaymentUrl({ amount, orderId, orderInfo }) {
  console.log("🔗 [vnpay-handler] Creating VNPAY payment URL...");
  // Mock URL for testing
  const paymentUrl = `https://sandbox.vnpayment.vn/vpcpay.html?amount=${amount}&orderId=${orderId}`;
  console.log("✅ [vnpay-handler] Payment URL:", paymentUrl);
  return paymentUrl;
}

export default async function handler(req, res) {
  console.log("📥 [vnpay-handler] API called");
  console.log("➡️ Method:", req.method);
  console.log("➡️ Headers:", JSON.stringify(req.headers, null, 2));
  console.log("➡️ Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    console.warn("⚠️ [vnpay-handler] Unsupported Method:", req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, transactionId, chargeId, locationId, amount, contactId } = req.body;

  // 🔥 list_payment_methods
  if (type === 'list_payment_methods') {
    console.log("🟢 [vnpay-handler] Handling list_payment_methods");
    const paymentMethods = [
      {
        id: "vnpay",
        type: "custom",
        title: "VNPAY",
        subTitle: "Click để thanh toán",
        expiry: "",
        customerId: contactId,
        imageUrl: "https://vnpay-webhook.vercel.app/logo.png"
      }
    ];
    console.log("✅ [vnpay-handler] Returning payment methods:", JSON.stringify(paymentMethods, null, 2));
    return res.status(200).json(paymentMethods);
  }

  // 🔥 charge_payment_method
  if (type === 'charge_payment_method') {
    console.log("🟠 [vnpay-handler] Handling charge_payment_method");
    try {
      const paymentUrl = await createVnpayPaymentUrl({
        amount,
        orderId: transactionId,
        orderInfo: contactId
      });
      return res.status(200).json({ paymentUrl });
    } catch (err) {
      console.error("🔥 [vnpay-handler] Error creating paymentUrl:", err.message);
      return res.status(500).json({ error: 'Failed to create paymentUrl' });
    }
  }

  // 🔥 send_webhook
  if (type === 'send_webhook') {
    console.log("📨 [vnpay-handler] Handling send_webhook");
    try {
      await sendPaymentCapturedWebhook({
        chargeId,
        ghlTransactionId: transactionId,
        amount,
        locationId
      });
      return res.status(200).json({ success: true, message: "✅ Webhook sent to GHL" });
    } catch (err) {
      console.error("🔥 [vnpay-handler] Error sending webhook:", err.message);
      return res.status(500).json({ error: 'Failed to send webhook to GHL' });
    }
  }

  // 🔥 verify
  if (type === 'verify') {
    console.log("🔍 [vnpay-handler] Handling verify");
    if (!transactionId || !chargeId || !locationId) {
      console.error("❌ [vnpay-handler] Missing verify params");
      return res.status(400).json({ error: 'Missing verify params' });
    }

    const isValidPayment = true; // Mock validation
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
        console.error("🔥 [vnpay-handler] Webhook error during verify:", err.message);
        return res.status(500).json({ error: 'Failed to send webhook during verify' });
      }
    } else {
      console.warn("⚠️ [vnpay-handler] Invalid payment");
      return res.status(200).json({ failed: true });
    }
  }

  console.warn("⚠️ [vnpay-handler] Unknown type:", type);
  return res.status(400).json({ error: 'Unknown type' });
}
