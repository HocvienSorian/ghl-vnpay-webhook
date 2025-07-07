import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;

const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
  Version: '2021-07-28',
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

export async function fetchContactDetails(contactId) {
  try {
    const res = await axios.get(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: GHL_HEADERS
    });
    return res.data?.contact || null;
  } catch (err) {
    console.error('❌ Lỗi fetchContactDetails:', err.response?.data || err.message);
    return null;
  }
}

export async function updateInvoiceInGHL(invoiceId, data) {
  try {
    console.log('📤 Đang update invoiceId:', invoiceId);
    const res = await axios.put(`${GHL_API_BASE}/invoices/${invoiceId}`, data, {
      headers: GHL_HEADERS
    });
    return res.data;
  } catch (err) {
    console.error('❌ Lỗi updateInvoiceInGHL:', err.response?.data || err.message);
    throw err;
  }
}
