// pages/api/setup-config.js
import axios from 'axios';

async function checkProviderExists(locationId, accessToken) {
  try {
    const res = await axios.get(
      'https://services.leadconnectorhq.com/payments/custom-provider/provider',
      {
        params: { locationId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Version: '2021-07-28',
          Accept: 'application/json'
        }
      }
    );
    return res.data && res.data.provider;
  } catch (err) {
    console.error("⚠️ [setup-config] Không kiểm tra được provider:", err.response?.data || err.message);
    return false;
  }
}

async function createProvider(locationId, accessToken, vnp_TmnCode, vnp_HashSecret) {
  const testApiKey = `${vnp_TmnCode}_test`;
  const testPublishableKey = `${vnp_HashSecret}_test`;
  const liveApiKey = `${vnp_TmnCode}_live`;
  const livePublishableKey = `${vnp_HashSecret}_live`;

  const paymentsUrl = 'https://vnpay-webhook.vercel.app/pay.html';
  const queryUrl = 'https://vnpay-webhook.vercel.app/api/vnpay-handler';
  const imageUrl = 'https://vnpay-webhook.vercel.app/logo.png';

  console.log("🚀 [setup-config] Creating provider...");
  await axios.post(
    'https://services.leadconnectorhq.com/payments/custom-provider/provider',
    {
      name: `VNPAY Integration`,
      description: `Tích hợp cổng VNPAY`,
      paymentsUrl,
      queryUrl,
      imageUrl,
      providerConfig: {
        test: { liveMode: false, apiKey: testApiKey, publishableKey: testPublishableKey },
        live: { liveMode: true, apiKey: liveApiKey, publishableKey: livePublishableKey }
      }
    },
    {
      params: { locationId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }
  );

  console.log("🚀 [setup-config] Connecting provider to location...");
  await axios.post(
    'https://services.leadconnectorhq.com/payments/custom-provider/connect',
    {
      test: { apiKey: testApiKey, publishableKey: testPublishableKey },
      live: { apiKey: liveApiKey, publishableKey: livePublishableKey }
    },
    {
      params: { locationId },
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    }
  );

  console.log("✅ [setup-config] Provider connected successfully");
}

export default async function handler(req, res) {
  console.log("📥 [setup-config] API called");
  console.log("➡️ Method:", req.method);
  console.log("➡️ Body:", JSON.stringify(req.body, null, 2));

  if (req.method !== 'POST') {
    console.warn("⚠️ [setup-config] Unsupported Method:", req.method);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { locationId, accessToken, vnp_TmnCode, vnp_HashSecret } = req.body;

  if (!locationId || !accessToken || !vnp_TmnCode || !vnp_HashSecret) {
    console.error("❌ [setup-config] Missing configuration parameters");
    return res.status(400).json({ error: 'Missing configuration parameters' });
  }

  try {
    const providerExists = await checkProviderExists(locationId, accessToken);
    if (!providerExists) {
      await createProvider(locationId, accessToken, vnp_TmnCode, vnp_HashSecret);
    } else {
      console.log("✅ [setup-config] Provider already exists for locationId:", locationId);
    }

    return res.status(200).json({ message: '✅ Provider setup completed' });
  } catch (error) {
    console.error("❌ [setup-config] Error:", error.response?.status, JSON.stringify(error.response?.data, null, 2));
    return res.status(500).json({
      error: 'Failed to configure provider',
      details: error.response?.data || error.message
    });
  }
}
