const axios = require('axios');

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

  // Create White-label Integration Provider
  async createIntegrationProvider(data) {
    const url = `${GHL_API_BASE}/integrations/provider/whitelabel`;
    const payload = {
      altId: this.altId,
      altType: this.altType,
      ...data
    };

    return axios.post(url, payload, { headers: this.headers });
  }

  // List Orders
  async listOrders() {
    const url = `${GHL_API_BASE}/orders`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // Get Order by ID
  async getOrderById(orderId) {
    const url = `${GHL_API_BASE}/orders/${orderId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // Create Order Fulfillment
  async createFulfillment(orderId, fulfillmentData) {
    const url = `${GHL_API_BASE}/orders/${orderId}/fulfillments`;
    const data = {
      altId: this.altId,
      altType: this.altType,
      ...fulfillmentData
    };

    return axios.post(url, data, { headers: this.headers });
  }

  // List Fulfillments
  async listFulfillments(orderId) {
    const url = `${GHL_API_BASE}/orders/${orderId}/fulfillments`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // List Transactions
  async listTransactions() {
    const url = `${GHL_API_BASE}/transactions`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // Get Transaction by ID
  async getTransactionById(transactionId) {
    const url = `${GHL_API_BASE}/transactions/${transactionId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // List Subscriptions
  async listSubscriptions() {
    const url = `${GHL_API_BASE}/subscriptions`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }

  // Get Subscription by ID
  async getSubscriptionById(subscriptionId) {
    const url = `${GHL_API_BASE}/subscriptions/${subscriptionId}`;
    const params = { altId: this.altId, altType: this.altType };
    return axios.get(url, { headers: this.headers, params });
  }
}

module.exports = GHL;
