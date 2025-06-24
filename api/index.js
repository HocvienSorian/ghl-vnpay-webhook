// index.js
import { generatePaymentUrl } from '../vnpay.js';
import GHL from '../ghl.js';

const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

const ghl = new GHL(GHL_ACCESS_TOKEN, GHL_LOCATION_ID);

async function createInvoiceInGHL({ contactId, amount, description, payDate }) {
  try {
    if (!contactId || typeof contactId !== 'string') {
      throw new Error('contactId không hợp lệ');
    }

    const response = await ghl.createInvoice({
      contactId: String(contactId),
      amount,
      description,
      payDate,
    });
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi tạo invoice trong GHL:', error.response?.data || error.message);
    throw error;
  }
}

async function updateGHLContact(contactId, updateData) {
  try {
    if (typeof ghl.updateContact !== 'function') {
      throw new Error('GHL class chưa có method updateContact');
    }
    const response = await ghl.updateContact(contactId, updateData);
    return response.data;
  } catch (error) {
    console.error('❌ Lỗi cập nhật contact trong GHL:', error.response?.data || error.message);
    throw error;
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Chỉ hỗ trợ GET hoặc POST' });
  }

  try {
    const { vnp_SecureHash, vnp_SecureHashType, ...vnpParams } = req.query;

    console.log('📥 req.query:', req.query);
    console.log('🔐 vnp_SecureHash:', vnp_SecureHash);

    if (!vnp_SecureHash) {
      return res.status(400).json({ error: 'Thiếu tham số vnp_SecureHash' });
    }

    const isValid = verifyVnpResponse({ ...vnpParams, vnp_SecureHash });

    console.log('✅ Checksum hợp lệ?', isValid);

    if (!isValid) {
      return res.status(400).json({ error: 'Checksum không hợp lệ' });
    }

    const {
      vnp_TxnRef,
      vnp_Amount,
      vnp_OrderInfo,
      vnp_ResponseCode,
      vnp_PayDate,
    } = vnpParams;

    if (vnp_ResponseCode !== '00') {
      return res.status(200).json({ message: 'Giao dịch thất bại từ phía VNPAY' });
    }

    const customerId = vnp_OrderInfo;
    const amount = parseInt(vnp_Amount, 10) / 100;

    console.log('🧾 Tạo invoice với:', { customerId, amount, vnp_TxnRef, vnp_PayDate });

    await createInvoiceInGHL({
      contactId: String(customerId),
      amount,
      description: `Thanh toán đơn hàng #${vnp_TxnRef}`,
      payDate: vnp_PayDate,
    });

    await updateGHLContact(customerId, {
      tags: ['Đã thanh toán VNPAY'],
    });

    return res.status(200).json({ message: '✅ Đã xử lý VNPAY IPN thành công' });
  } catch (error) {
    console.error('❌ Lỗi xử lý webhook chi tiết:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
    });
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
