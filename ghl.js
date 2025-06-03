import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com/payments';
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

  async createIntegrationProvider(data) {
    const url = `${GHL_API_BASE}/integrations/provider/whitelabel`;
    const payload = {
      altId: this.altId,
      altType: this.altType,
      ...data
    };
    return axios.post(url, payload, { headers: this.headers });
  }

  async listOrders() {
    const url = `${GHL_API_BASE}/orders`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  async getOrderById(orderId) {
    const url = `${GHL_API_BASE}/orders/${orderId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  async createFulfillment(orderId, fulfillmentData) {
    const url = `${GHL_API_BASE}/orders/${orderId}/fulfillments`;
    const data = {
      altId: this.altId,
      altType: this.altType,
      ...fulfillmentData
    };
    return axios.post(url, data, { headers: this.headers });
  }

  async listFulfillments(orderId) {
    const url = `${GHL_API_BASE}/orders/${orderId}/fulfillments`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  async listTransactions() {
    const url = `${GHL_API_BASE}/transactions`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  async getTransactionById(transactionId) {
    const url = `${GHL_API_BASE}/transactions/${transactionId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  async listSubscriptions() {
    const url = `${GHL_API_BASE}/subscriptions`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  async getSubscriptionById(subscriptionId) {
    const url = `${GHL_API_BASE}/subscriptions/${subscriptionId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // OPTIONAL: Cập nhật contact (bạn cần định nghĩa endpoint cụ thể nếu muốn dùng trong webhook)
  async updateContact(contactId, updateData) {
    const url = `https://services.leadconnectorhq.com/contacts/${contactId}`;
    return axios.put(url, updateData, { headers: this.headers });
  }
}

export default GHL;
