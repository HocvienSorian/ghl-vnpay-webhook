import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
  Version: '2021-07-28',
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

export async function fetchInvoiceIdByContact(contactId) {
  try {
    const res = await axios.get(`${GHL_API_BASE}/invoices/`, {
      params: {
        altId: GHL_LOCATION_ID,
        altType: 'location',
        contactId,
        limit: 1,
        offset: 0,
        paymentMode: 'live'
      },
      headers: GHL_HEADERS
    });

    const invoice = res.data?.data?.[0];
    return invoice?._id || null;
  } catch (err) {
    console.error('❌ Lỗi fetchInvoiceIdByContact:', err.message);
    return null;
  }
}

export async function updateInvoiceInGHL(invoiceId, data) {
  try {
    const res = await axios.put(`${GHL_API_BASE}/invoices/${invoiceId}`, data, {
      headers: GHL_HEADERS
    });
    return res.data;
  } catch (err) {
    console.error('❌ Lỗi updateInvoiceInGHL:', err.message);
    throw err;
  }
}
