// pages/api/vnpay-handler.js
import axios from 'axios';

const GHL_WEBHOOK_URL = "https://backend.leadconnectorhq.com/payments/custom-provider/webhook";
const PRIVATE_PROVIDER_API_KEY = process.env.GHL_PRIVATE_PROVIDER_API_KEY;
const SETUP_CONFIG_URL = "https://vnpay-webhook.vercel.app/api/setup-config";

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

  const res = await axios.post(GHL_WEBHOOK_URL, payload, {
    headers: { "Content-Type": "application/json" },
    timeout: 7000
  });
  console.log("✅ [vnpay-handler] Webhook sent. Status:", res.status);
  return res.data;
}

async function ensureProviderConfig(locationId) {
  try {
    console.log("🔍 [vnpay-handler] Checking provider config for location:", locationId);
    const res = await axios.get('https://services.leadconnectorhq.com/payments/custom-provider/provider', {
      params: { locationId },
      headers: {
        Authorization: `Bearer ${PRIVATE_PROVIDER_API_KEY}`,
        Version: '2021-07-28',
        Accept: 'application/json'
      }
    });
    if (!res.data || !res.data.provider) {
      console.warn("⚠️ [vnpay-handler] Provider missing. Auto-setup...");
      await axios.post(SETUP_CONFIG_URL, {
        locationId,
        accessToken: PRIVATE_PROVIDER_API_KEY,
        vnp_TmnCode: process.env.VNP_TMNCODE,
        vnp_HashSecret: process.env.VNP_HASHSECRET
      });
    } else {
      console.log("✅ [vnpay-handler] Provider config exists");
    }
  } catch (err) {
    console.error("🔥 [vnpay-handler] Error checking/setting up provider:", err.message);
  }
}

export default async function handler(req, res) {
  console.log("📥 [vnpay-handler] API called");
  console.log("➡️ Method:", req.method);
  console.log("➡️ Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, transactionId, chargeId, locationId, amount, contactId } = req.body;

  // 🆕 Ensure provider config
  if (locationId) {
    await ensureProviderConfig(locationId);
  }

  if (type === 'list_payment_methods') {
    console.log("🟢 [vnpay-handler] Handling list_payment_methods");
    return res.status(200).json([
      {
        id: "vnpay",
        type: "custom",
        title: "VNPAY",
        subTitle: "Click để thanh toán",
        expiry: "",
        customerId: contactId,
        imageUrl: "https://vnpay-webhook.vercel.app/logo.png"
      }
    ]);
  }

  if (type === 'charge_payment_method') {
    console.log("🟠 [vnpay-handler] Handling charge_payment_method");
    const paymentUrl = `https://sandbox.vnpayment.vn/vpcpay.html?amount=${amount}&orderId=${transactionId}`;
    return res.status(200).json({ paymentUrl });
  }

  if (type === 'send_webhook') {
    console.log("📨 [vnpay-handler] Handling send_webhook");
    await sendPaymentCapturedWebhook({ chargeId, ghlTransactionId: transactionId, amount, locationId });
    return res.status(200).json({ success: true });
  }

  if (type === 'verify') {
    console.log("🔍 [vnpay-handler] Handling verify");
    await sendPaymentCapturedWebhook({ chargeId, ghlTransactionId: transactionId, amount, locationId });
    return res.status(200).json({ success: true });
  }

  console.warn("⚠️ [vnpay-handler] Unknown type:", type);
  return res.status(400).json({ error: 'Unknown type' });
}
