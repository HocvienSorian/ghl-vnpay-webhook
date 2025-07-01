// pages/api/fetch-ghl-transaction.js

import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const GHL_ALT_TYPE = process.env.GHL_ALT_TYPE || 'location';

const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
  Version: '2021-07-28',
  Accept: 'application/json',
};

async function fetchLatestTransaction() {
  try {
    // B1: Gọi API List Transactions
    const txListRes = await axios.get(`${GHL_API_BASE}/payments/transactions`, {
      params: {
        altId: GHL_LOCATION_ID,
        altType: GHL_ALT_TYPE,
        limit: 1,
      },
      headers: GHL_HEADERS,
    });

    const latestTransaction = txListRes.data?.data?.[0];
    if (!latestTransaction) throw new Error('No transactions found.');

    const { _id: transactionId, contactId, currency, amount, entityId } = latestTransaction;

    // B2: Gọi API Transaction Detail (nếu cần thêm dữ liệu)
    const txDetailRes = await axios.get(`${GHL_API_BASE}/payments/transactions/${transactionId}`, {
      params: {
        altId: GHL_LOCATION_ID,
        altType: GHL_ALT_TYPE,
      },
      headers: GHL_HEADERS,
    });

    const txDetail = txDetailRes.data;

    // B3: Gọi API Get Contact
    let contactDetail = {};
    if (contactId) {
      try {
        const contactRes = await axios.get(`${GHL_API_BASE}/contacts/${contactId}`, {
          headers: GHL_HEADERS,
        });
        contactDetail = contactRes.data?.contact || {};
      } catch (e) {
        console.warn('⚠️ Failed to fetch contact detail:', e.message);
      }
    }

    return {
      transactionId,
      amount: txDetail.amount || amount || 0,
      currency: txDetail.currency || currency || 'VND',
      contactId,
      contactName: contactDetail.name || '',
      contactEmail: contactDetail.email || '',
      entityId: txDetail.entityId || entityId,
      locationId: GHL_LOCATION_ID,
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
