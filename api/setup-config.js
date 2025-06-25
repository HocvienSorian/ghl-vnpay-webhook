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

  // 🔐 Tạo mock API keys cho test & live
  const testApiKey = `${vnp_TmnCode}_test`;
  const testPublishableKey = `${vnp_HashSecret}_test`;
  const liveApiKey = `${vnp_TmnCode}_live`;
  const livePublishableKey = `${vnp_HashSecret}_live`;

  // 🌐 Các URL công khai
  const paymentsUrl = 'https://vnpay-webhook.vercel.app/pay.html';
  const queryUrl = 'https://vnpay-webhook.vercel.app/api/vnpay-handler';
  const imageUrl = 'https://vnpay-webhook.vercel.app/logo.png';

  try {
    // ✅ Bước 1: Tạo Provider với providerConfig đầy đủ
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

    // ✅ Bước 2: Gán cấu hình kết nối cho location
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
