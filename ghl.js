// File: ghl.js
import axios from 'axios';

const GHL_API_BASE = 'https://services.leadconnectorhq.com/payments';
const GHL_CONTACT_BASE = 'https://services.leadconnectorhq.com/contacts';
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

  // Tạo invoice thông qua hệ thống tích hợp (dành cho Webhook/Integration)
  async createIntegrationProvider(data) {
    const url = `${GHL_API_BASE}/integrations/provider/whitelabel`;
    const payload = {
      altId: this.altId,
      altType: this.altType,
      ...data
    };
    return axios.post(url, payload, { headers: this.headers });
  }

  // ✅ Tạo invoice chi tiết theo mẫu của GHL
  async createInvoice(invoiceData) {
    const url = `https://services.leadconnectorhq.com/invoices/`;
    const payload = {
      altId: this.altId,
      altType: this.altType,
      ...invoiceData
    };
    return axios.post(url, payload, { headers: this.headers });
  }

  // 🔄 Danh sách đơn hàng
  async listOrders() {
    const url = `${GHL_API_BASE}/orders`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // 📦 Lấy đơn hàng theo ID
  async getOrderById(orderId) {
    const url = `${GHL_API_BASE}/orders/${orderId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // ✅ Tạo fulfillment cho đơn hàng
  async createFulfillment(orderId, fulfillmentData) {
    const url = `${GHL_API_BASE}/orders/${orderId}/fulfillments`;
    const data = {
      altId: this.altId,
      altType: this.altType,
      ...fulfillmentData
    };
    return axios.post(url, data, { headers: this.headers });
  }

  // 📦 Danh sách fulfillment theo đơn hàng
  async listFulfillments(orderId) {
    const url = `${GHL_API_BASE}/orders/${orderId}/fulfillments`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // 💰 Danh sách giao dịch
  async listTransactions() {
    const url = `${GHL_API_BASE}/transactions`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // 💳 Lấy giao dịch theo ID
  async getTransactionById(transactionId) {
    const url = `${GHL_API_BASE}/transactions/${transactionId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // 📅 Danh sách subscription
  async listSubscriptions() {
    const url = `${GHL_API_BASE}/subscriptions`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // 🔍 Lấy subscription theo ID
  async getSubscriptionById(subscriptionId) {
    const url = `${GHL_API_BASE}/subscriptions/${subscriptionId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // 🧑‍💼 Cập nhật thông tin contact theo mẫu API chính thức
  async updateContact(contactId, updateData) {
    const url = `${GHL_CONTACT_BASE}/${contactId}`;
    return axios.put(url, updateData, { headers: this.headers });
  }
}

export default GHL;
