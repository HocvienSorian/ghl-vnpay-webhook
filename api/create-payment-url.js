import axios from 'axios';
import { generatePaymentUrl } from '../vnpay.js';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const GHL_HEADERS = {
  Authorization: `Bearer ${GHL_ACCESS_TOKEN}`,
  Version: '2021-07-28',
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

// 🟢 Extract invoiceId từ URL
function extractInvoiceIdFromUrl(url) {
  const match = url.match(/invoice\/([a-f0-9]{24})/);
  return match ? match[1] : null;
}

// 🟢 Format ngày YYYY-MM-DD
function getTodayDate() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức POST' });
  }

  const { amount, orderId, contactId, ipAddr, paymentLink } = req.body;

  if (!amount || !ipAddr) {
    console.warn('⚠ Thiếu tham số:', { amount, contactId, ipAddr, paymentLink });
    return res.status(400).json({ error: 'Thiếu amount hoặc ipAddr' });
  }

  try {
    const requiredEnvs = ['VNP_HASHSECRET', 'VNP_TMNCODE', 'VNP_URL', 'VNP_RETURNURL'];
    const missing = requiredEnvs.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error('❌ Thiếu biến môi trường VNPAY:', missing);
      return res.status(500).json({ error: 'Thiếu cấu hình môi trường VNPAY', missing });
    }

    let invoiceId = null;

    // 🟢 Trường hợp 1: Có sẵn paymentLink từ frontend
    if (paymentLink) {
      invoiceId = extractInvoiceIdFromUrl(paymentLink);
      if (invoiceId) {
        console.log('📦 Trường hợp 1: Extracted invoiceId =', invoiceId);
      }
    }

    // 🟢 Trường hợp 2: Fallback Create Invoice nếu không có paymentLink
    if (!invoiceId && contactId) {
      const today = getTodayDate();
      const invoicePayload = {
        altId: GHL_LOCATION_ID,
        altType: 'location',
        name: 'Thanh toán VNPAY',
        businessDetails: {
          logoUrl: 'https://example.com/logo.png',
          name: 'Sorian Marketing',
          phoneNo: '+1-214-559-6993',
          address: {
            addressLine1: '722 S PECK STREET',
            city: 'Shiner',
            state: 'TX',
            countryCode: 'US',
            postalCode: '77984'
          },
          website: 'www.sorianmarketing.com'
        },
        currency: 'VND',
        items: [
          {
            name: 'Thanh toán VNPAY',
            description: `Đơn hàng #${orderId || 'N/A'}`,
            currency: 'VND',
            amount,
            qty: 1,
            type: 'one_time',
            taxInclusive: true
          }
        ],
        discount: { value: 0, type: 'percentage' },
        termsNotes: '<p>Hóa đơn thanh toán qua VNPAY</p>',
        title: 'INVOICE',
        contactDetails: {
          id: contactId,
          name: 'Khách hàng VNPAY',
          phoneNo: '+84-123-456-789',
          email: 'customer@example.com',
          address: {
            countryCode: 'VN'
          }
        },
        invoiceNumberPrefix: 'INV-',
        issueDate: today,
        dueDate: today,
        liveMode: true
      };

      console.log('📤 Trường hợp 2: Create Invoice Payload:', JSON.stringify(invoicePayload, null, 2));

      const ghlRes = await axios.post(`${GHL_API_BASE}/invoices/`, invoicePayload, {
        headers: GHL_HEADERS
      });

      invoiceId = ghlRes.data?._id;

      if (invoiceId) {
        console.log('📦 Trường hợp 2: Created invoiceId =', invoiceId);
      } else {
        console.error('❌ Không tìm thấy invoiceId trong response:', ghlRes.data);
        return res.status(500).json({ error: 'Không tìm thấy invoiceId trong response' });
      }
    }

    if (!invoiceId) {
      console.error('❌ Không có invoiceId để tiếp tục');
      return res.status(500).json({ error: 'Không có invoiceId để tiếp tục' });
    }

    // 🟢 Tạo paymentUrl VNPAY
    const paymentUrl = generatePaymentUrl({
      amount,
      orderInfo: invoiceId,
      ipAddr
    });

    console.log('✅ Generated paymentUrl:', paymentUrl);

    return res.status(200).json({ paymentUrl });
  } catch (err) {
    console.error('🔥 Lỗi khi tạo paymentUrl:', err.response?.data || err.message);
    return res.status(500).json({
      error: 'Lỗi tạo paymentUrl',
      detail: err.message,
      suggestion: '❗ Kiểm tra cấu hình VNPAY & GHL'
    });
  }
}

