// File: /api/index.js
import { verifyVnpResponse } from '../vnpay.js';
import GHL from '../ghl.js';

const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

if (!GHL_ACCESS_TOKEN || !GHL_LOCATION_ID) {
  console.error('Thiếu biến môi trường GHL_ACCESS_TOKEN hoặc GHL_LOCATION_ID');
}

const ghl = new GHL(GHL_ACCESS_TOKEN, GHL_LOCATION_ID);

async function createInvoiceInGHL({ contactId, amount, description, payDate }) {
  try {
    const response = await ghl.createInvoice({
      contactId,
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
    console.error('❌ Lỗi cập nhật contact:', error.response?.data || error.message);
    throw error;
  }
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Chỉ hỗ trợ phương thức GET hoặc POST' });
  }

  try {
    const { vnp_SecureHash, vnp_SecureHashType, ...vnpParams } = req.query;

    if (!vnp_SecureHash) {
      return res.status(400).json({ error: 'Thiếu tham số vnp_SecureHash' });
    }

    // ✅ Log debug nếu cần
    console.log('👉 Params từ VNPAY:', vnpParams);
    console.log('🔐 Received SecureHash:', vnp_SecureHash);

    // ✅ Truyền cả secureHash để kiểm tra
    const isValid = verifyVnpResponse({ ...vnpParams, vnp_SecureHash });

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
      return res.status(200).json({ message: 'Giao dịch không thành công. Không cập nhật vào GHL.' });
    }

    const customerId = vnp_OrderInfo;

    await createInvoiceInGHL({
      contactId: customerId,
      amount: parseInt(vnp_Amount, 10) / 100,
      description: `Thanh toán đơn hàng #${vnp_TxnRef}`,
      payDate: vnp_PayDate,
    });

    await updateGHLContact(customerId, {
      tags: ['Đã thanh toán VNPAY'],
    });

    return res.status(200).json({ message: '✅ Đã xử lý VNPAY IPN và cập nhật vào GHL' });
  } catch (error) {
    console.error('❌ Lỗi xử lý webhook:', error);
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
