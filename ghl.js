import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com/payments';
const GHL_CONTACT_BASE = 'https://services.leadconnectorhq.com/contacts';
const GHL_INVOICE_URL = 'https://services.leadconnectorhq.com/invoices/';
const API_VERSION = '2021-07-28';

class GHL {
  constructor(token, altId, altType = 'location') {
    this.token = token;
    this.altId = altId;
    this.altType = altType;
  }

  get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Version: API_VERSION,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async createInvoice({ contactId, amount, description }) {
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      altId: this.altId,
      altType: this.altType,
      name: `Hóa Đơn ${contactId}`,
      issueDate: today,
      currency: 'VND',
      contactDetails: { id: contactId },
      businessDetails: {
        name: 'Học Viện Sorian',
        taxId: '000000000',
        address: '19 Võ Văn Tần, Phường 6, Quận 3, TP.HCM'
      },
      items: [{ name: description, quantity: 1, unitPrice: amount }]
    };
    return axios.post(GHL_INVOICE_URL, payload, { headers: this.headers });
  }

  async getTransactionDetails(transactionId) {
    const url = `${GHL_API_BASE}/transactions/${transactionId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }
}

export default GHL;
