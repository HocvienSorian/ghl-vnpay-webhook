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
    // Bước 1: Lấy danh sách transaction
    const txList = await axios.get(`${GHL_API_BASE}/payments/transactions`, {
      params: {
        altId: GHL_LOCATION_ID,
        altType: GHL_ALT_TYPE,
        limit: 1,
      },
      headers: GHL_HEADERS,
    });

    const transaction = txList.data?.data?.[0];
    if (!transaction) throw new Error('No transactions found');
    const txnId = transaction._id;

    // Bước 2: Lấy chi tiết
    const txDetail = await axios.get(`${GHL_API_BASE}/payments/transactions/${txnId}`, {
      params: {
        altId: GHL_LOCATION_ID,
        altType: GHL_ALT_TYPE,
      },
      headers: GHL_HEADERS,
    });

    // 🛠 Một số API của GHL trả về data bên trong data.data
    const tx = txDetail.data?.data || txDetail.data;

    console.log("📦 Giao dịch chi tiết từ GHL:", tx);

    return {
      amount: tx.amount,
      currency: tx.currency || 'VND',
      transactionId: tx._id,
      orderId: tx.entityId || tx._id,
      contactId: tx.contactId,
      locationId: GHL_LOCATION_ID,
      apiKey: GHL_ACCESS_TOKEN
    };
  } catch (err) {
    console.error('❌ Lỗi khi lấy transaction GHL:', err.response?.data || err.message);
    throw err;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const transaction = await fetchLatestTransaction();
    res.status(200).json(transaction);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transaction data', details: err.message });
  }
}
