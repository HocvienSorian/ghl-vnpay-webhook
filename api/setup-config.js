import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    locationId,
    accessToken,
    vnp_TmnCode,
    vnp_HashSecret
  } = req.body;

  if (!locationId || !accessToken || !vnp_TmnCode || !vnp_HashSecret) {
    return res.status(400).json({ error: 'Thiếu thông tin cấu hình' });
  }

  // 🧪 API key mock từ thông tin VNPAY cho cả 2 chế độ
  const testApiKey = `${vnp_TmnCode}_test`;
  const testPublishableKey = `${vnp_HashSecret}_test`;
  const liveApiKey = `${vnp_TmnCode}_live`;
  const livePublishableKey = `${vnp_HashSecret}_live`;

  // ⚙️ Public URLs
  const paymentsUrl = 'https://vnpay-webhook.vercel.app/pay.html';
  const queryUrl = 'https://vnpay-webhook.vercel.app/api/vnpay-handler';
  const imageUrl = 'https://vnpay-webhook.vercel.app/logo.png';

  try {
    // 1️⃣ Tạo hoặc ghi đè Provider (vì không có PUT nên ta dùng POST lại là cách được chấp nhận)
    const providerResp = await axios.post(
      'https://services.leadconnectorhq.com/payments/custom-provider/provider',
      {
        name: `VNPAY Integration`,
        description: `Tích hợp cổng VNPAY cho cả LIVE & TEST`,
        paymentsUrl,
        queryUrl,
        imageUrl,
        providerConfig: {
          test: {
            liveMode: false,
            apiKey: testApiKey,
            publishableKey: testPublishableKey
          },
          live: {
            liveMode: true,
            apiKey: liveApiKey,
            publishableKey: livePublishableKey
          }
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

    console.log('✅ Tạo provider:', providerResp.data);

    // 2️⃣ Gọi connect API để gán lại key một lần nữa (an toàn)
    const connectResp = await axios.post(
      'https://services.leadconnectorhq.com/payments/custom-provider/connect',
      {
        test: {
          apiKey: testApiKey,
          publishableKey: testPublishableKey
        },
        live: {
          apiKey: liveApiKey,
          publishableKey: livePublishableKey
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

    console.log('✅ Kết nối cấu hình:', connectResp.data);

    return res.status(200).json({
      message: '✅ Cấu hình provider thành công!',
      provider: providerResp.data,
      connection: connectResp.data
    });

  } catch (error) {
    const responseError = error.response?.data || {};
    console.error('❌ Lỗi khi cấu hình provider:', JSON.stringify(responseError, null, 2));

    return res.status(500).json({
      error: 'Lỗi khi cấu hình provider',
      message: responseError.message || error.message,
      details: responseError
    });
  }
}
