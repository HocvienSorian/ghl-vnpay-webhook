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
  const apiKey = ${vnp_TmnCode}_${mode};
  const publishableKey = ${vnp_HashSecret}_${mode};

  // ⚙️ Khai báo các URL
  const paymentsUrl = 'https://vnpay-webhook.vercel.app/pay.html'; // phải public
  const queryUrl = 'https://vnpay-webhook.vercel.app/api/vnpay-handler'; // placeholder
  const imageUrl = 'https://vnpay-webhook.vercel.app/logo.png'; // placeholder

  try {
    // 1️⃣ Tạo Payment Provider
    const providerResp = await axios.post(
      'https://services.leadconnectorhq.com/payments/custom-provider/provider',
      {
        name: VNPAY ${mode.toUpperCase()} Integration,
        description: Tích hợp cổng VNPAY chế độ ${mode.toUpperCase()},
        paymentsUrl,
        queryUrl,
        imageUrl
      },
      {
        params: { locationId },
        headers: {
          Authorization: Bearer ${accessToken},
          Version: '2021-07-28',
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    console.log(✅ Tạo provider ${mode}:, providerResp.data);

    // 2️⃣ Gọi connect để gán API key
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
          Authorization: Bearer ${accessToken},
          Version: '2021-07-28',
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      }
    );

    console.log(✅ Kết nối cấu hình ${mode}:, connectResp.data);

    return res.status(200).json({
      message: ✅ Cấu hình ${mode.toUpperCase()} thành công!,
      provider: providerResp.data,
      connection: connectResp.data
    });
  } catch (error) {
    const responseError = error.response?.data || {};
    console.error(❌ Lỗi ở bước cấu hình ${mode.toUpperCase()}:, JSON.stringify(responseError, null, 2));

    return res.status(500).json({
      error: 'Lỗi khi cấu hình provider',
      message: responseError.message || error.message,
      details: responseError
    });
  }
}
