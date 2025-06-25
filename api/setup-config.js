import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    locationId,
    accessToken,
    vnp_TmnCode,
    vnp_HashSecret,
    mode // "test" hoặc "live"
  } = req.body;

  if (!locationId || !accessToken || !vnp_TmnCode || !vnp_HashSecret || !mode) {
    return res.status(400).json({ error: 'Thiếu thông tin cấu hình' });
  }

  // 🧪 Mock API key từ thông tin VNPAY
  const apiKey = `${vnp_TmnCode}_${mode}`;
  const publishableKey = `${vnp_HashSecret}_${mode}`;

  // ⚙️ URL public trên Vercel (cần đúng domain bạn đã deploy)
  const baseUrl = 'https://ghl-vnpay-webhook.vercel.app';
  const paymentsUrl = `${baseUrl}/pay.html`;
  const queryUrl = `${baseUrl}/api/vnpay-handler`;
  const imageUrl = `${baseUrl}/logo.png`;

  try {
    // 1️⃣ Tạo Custom Provider
    const providerResp = await axios.post(
      'https://services.leadconnectorhq.com/payments/custom-provider/provider',
      {
        name: `VNPAY ${mode.toUpperCase()} Integration`,
        description: `Tích hợp cổng VNPAY chế độ ${mode.toUpperCase()}`,
        paymentsUrl,
        queryUrl,
        imageUrl
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

    console.log(`✅ [${mode.toUpperCase()}] Provider created:`, providerResp.data);

    // 2️⃣ Connect Provider bằng API key + Publishable key
    const connectResp = await axios.post(
      'https://services.leadconnectorhq.com/payments/custom-provider/connect',
      {
        [mode]: {
          apiKey,
          publishableKey
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

    console.log(`✅ [${mode.toUpperCase()}] Connected successfully.`);

    return res.status(200).json({
      message: `✅ Cấu hình ${mode.toUpperCase()} thành công!`,
      provider: providerResp.data,
      connection: connectResp.data
    });
  } catch (error) {
    const responseError = error.response?.data || {};
    console.error(`❌ [${mode.toUpperCase()}] Lỗi cấu hình:`, responseError);

    return res.status(500).json({
      error: 'Lỗi khi cấu hình provider',
      message: responseError.message || error.message,
      details: responseError
    });
  }
}
