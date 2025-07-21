// pages/api/vnpay-handler.js
import axios from 'axios';
import { generatePaymentUrl } from '../vnpay.js';

const GHL_WEBHOOK_URL = "https://backend.leadconnectorhq.com/payments/custom-provider/webhook";
const PRIVATE_PROVIDER_API_KEY = process.env.GHL_PRIVATE_PROVIDER_API_KEY;

async function sendPaymentCapturedWebhook({ chargeId, ghlTransactionId, amount, locationId }) {
  if (!PRIVATE_PROVIDER_API_KEY) {
    console.error("🚨 Missing PRIVATE_PROVIDER_API_KEY");
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

  try {
    const res = await axios.post(GHL_WEBHOOK_URL, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 7000
    });
    console.log("✅ Webhook sent. Status:", res.status, res.data);
    return res.data;
  } catch (err) {
    console.error("❌ Webhook error:", err.response?.status, err.response?.data);
    throw err;
  }
}

export default async function handler(req, res) {
  console.log("📥 Incoming Request:", JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { type, transactionId, orderId, chargeId, locationId, amount, contactId, apiKey } = req.body;

  if (apiKey !== process.env.GHL_LIVE_API_KEY && apiKey !== process.env.GHL_TEST_API_KEY) {
    console.error("❌ Invalid API Key");
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (type === 'list_payment_methods') {
    console.log("🟢 Handling list_payment_methods");
    const paymentMethods = [
      {
        id: "vnpay",
        type: "card",
        title: "VNPAY QR",
        subTitle: "Thanh toán qua VNPAY",
        expiry: "",
        customerId: contactId,
        imageUrl: "https://vnpay-webhook.vercel.app/logo.png"
      }
    ];
    console.log("✅ Returning payment methods:", paymentMethods);
    return res.status(200).json(paymentMethods);
  }

  if (type === 'charge_payment_method') {
    console.log("🟠 Handling charge_payment_method");
    try {
      const paymentUrl = generatePaymentUrl({
        amount,
        orderInfo: contactId,
        ipAddr: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });
      console.log("✅ Generated payment URL:", paymentUrl);
      return res.status(200).json({
        success: true,
        paymentUrl,
        chargeId: orderId || transactionId,
        message: "Redirecting to VNPAY"
      });
    } catch (err) {
      console.error("🔥 Error generating paymentUrl:", err.message);
      return res.status(500).json({ success: false, failed: true, message: err.message });
    }
  }

  if (type === 'verify') {
    console.log("🔍 Handling verify");
    try {
      const paymentSuccess = true; // 📝 Replace with real VNPAY validation if needed
      if (paymentSuccess) {
        await sendPaymentCapturedWebhook({
          chargeId,
          ghlTransactionId: transactionId || orderId,
          amount,
          locationId
        });
        return res.status(200).json({ success: true });
      } else {
        return res.status(200).json({ failed: true });
      }
    } catch (err) {
      console.error("🔥 Error during verify:", err.message);
      return res.status(500).json({ error: 'Failed to verify payment' });
    }
  }

  console.warn("⚠️ Unknown type:", type);
  return res.status(400).json({ error: 'Unknown type' });
}
