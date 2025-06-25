// pages/api/setup-config.js

import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    locationId,
    accessToken,
    vnp_TmnCode,
    vnp_HashSecret,
    mode
  } = req.body;

  if (!locationId || !accessToken || !vnp_TmnCode || !vnp_HashSecret || !mode) {
    return res.status(400).json({ error: 'Thiếu thông tin cấu hình' });
  }

  try {
    // Define environment-based URLs
    const paymentsUrl = 'https://vnpay-webhook.vercel.app/pay.html';
    const queryUrl = 'https://vnpay-webhook.vercel.app/api/vnpay-handler'; // Your query handler
    const imageUrl = 'https://vnpay-webhook.vercel.app/logo.png';

    // 1. Create Payment Provider Config
    const providerResp = await axios.post(
      'https://services.leadconnectorhq.com/payments/custom-provider/provider',
      {
        name: `VNPAY ${mode.toUpperCase()} Integration`,
        description: `Cổng thanh toán VNPAY cấu hình ở chế độ ${mode.toUpperCase()}.`,
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

    // Generate mock API keys from VNP data (you can encode or transform)
    const apiKey = `${vnp_TmnCode}_${mode}`;
    const publishableKey = `${vnp_HashSecret}_${mode}`;

    // 2. Store API keys to .env.local
    const envFile = path.join(process.cwd(), '.env.local');
    const newEnv = `\nGHL_${mode.toUpperCase()}_API_KEY=${apiKey}\nGHL_${mode.toUpperCase()}_PUBLISHABLE_KEY=${publishableKey}\n`;
    fs.appendFileSync(envFile, newEnv);

    // 3. Connect Config to HighLevel
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

    return res.status(200).json({
      message: `✅ Cấu hình ${mode.toUpperCase()} thành công!`,
      provider: providerResp.data,
      connection: connectResp.data
    });
  } catch (error) {
    console.error('❌ Lỗi cấu hình:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'Lỗi khi cấu hình provider',
      details: error.response?.data || error.message
    });
  }
}
