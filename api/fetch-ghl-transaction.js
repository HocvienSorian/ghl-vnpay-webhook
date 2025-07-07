// pages/api/fetch-ghl-transaction.js
import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
  Version: '2021-07-28',
  Accept: 'application/json'
};

async function fetchLatestTransaction() {
  try {
    const txListRes = await axios.get(`${GHL_API_BASE}/payments/transactions`, {
      params: {
        altId: GHL_LOCATION_ID,
        altType: 'location',
        limit: 1,
      },
      headers: GHL_HEADERS,
    });

    const latestTransaction = txListRes.data?.data?.[0];
    if (!latestTransaction) throw new Error('No transactions found.');

    const { _id: transactionId, contactId, currency, amount, entityId } = latestTransaction;

    return {
      transactionId,
      entityId, // 🆕 Trả thêm entityId (invoiceId)
      amount: amount || 0,
      currency: currency || 'VND',
      contactId,
    };
  } catch (err) {
    console.error('❌ Error in fetchLatestTransaction:', err.message);
    throw err;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const transactionData = await fetchLatestTransaction();
    res.status(200).json(transactionData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transaction', details: err.message });
  }
}
