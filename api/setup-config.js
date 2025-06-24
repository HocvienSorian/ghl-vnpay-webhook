// pages/api/setup-config.js

import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      locationId,
      liveApiKey,
      livePublishableKey,
      testApiKey,
      testPublishableKey
    } = req.body;

    if (!locationId || !liveApiKey || !livePublishableKey || !testApiKey || !testPublishableKey) {
      return res.status(400).json({ error: 'Thiếu thông tin cấu hình đầy đủ' });
    }

    const options = {
      method: 'POST',
      url: 'https://services.leadconnectorhq.com/payments/custom-provider/connect',
      params: { locationId },
      headers: {
        Authorization: `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      data: {
        live: {
          apiKey: liveApiKey,
          publishableKey: livePublishableKey
        },
        test: {
          apiKey: testApiKey,
          publishableKey: testPublishableKey
        }
      }
    };

    const { data } = await axios.request(options);

    return res.status(200).json({ message: '✅ Đã cấu hình provider thành công', data });
  } catch (error) {
    console.error('❌ Lỗi cấu hình:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Lỗi khi cấu hình provider',
      details: error.response?.data || error.message
    });
  }
}
