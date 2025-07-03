// ======= ghl.js =======
import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_HEADERS = {
  Authorization: `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
  Version: '2021-07-28',
  Accept: 'application/json',
};

export async function createInvoiceInGHL({ contactId, amount, description, payDate }) {
  const response = await axios.post(`${GHL_API_BASE}/invoices/`, {
    contactId,
    amount,
    description,
    payDate,
  }, { headers: GHL_HEADERS });
  return response.data;
}

export async function updateGHLContact(contactId, updateData) {
  const response = await axios.put(`${GHL_API_BASE}/contacts/${contactId}`, updateData, {
    headers: GHL_HEADERS,
  });
  return response.data;
}

export async function fetchLatestTransaction() {
  const txListRes = await axios.get(`${GHL_API_BASE}/payments/transactions`, {
    params: { altId: process.env.GHL_LOCATION_ID, altType: 'location', limit: 1 },
    headers: GHL_HEADERS,
  });
  return txListRes.data?.data?.[0];
}
