import axios from 'axios';

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

  const testApiKey = `${vnp_TmnCode}_test`;
  const testPublishableKey = `${vnp_HashSecret}_test`;
  const liveApiKey = `${vnp_TmnCode}_live`;
  const livePublishableKey = `${vnp_HashSecret}_live`;

  const paymentsUrl = 'https://vnpay-webhook.vercel.app/pay.html';
  const queryUrl = 'https://vnpay-webhook.vercel.app/api/vnpay-handler';
  const imageUrl = 'https://vnpay-webhook.vercel.app/logo.png';

  try {
    console.log("🚀 [setup-config] Creating provider...");
    const providerResp = await axios.post(
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
    console.log("✅ [setup-config] Provider created:", JSON.stringify(providerResp.data, null, 2));

    console.log("🚀 [setup-config] Connecting provider to location...");
    const connectResp = await axios.post(
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
    console.log("✅ [setup-config] Connected:", JSON.stringify(connectResp.data, null, 2));

    return res.status(200).json({
      message: '✅ Provider configured successfully',
      provider: providerResp.data,
      connection: connectResp.data
    });
  } catch (error) {
    console.error("❌ [setup-config] Error:", error.response?.status, JSON.stringify(error.response?.data, null, 2));
    return res.status(500).json({
      error: 'Failed to configure provider',
      details: error.response?.data || error.message
    });
  }
}
