// File: /api/index.js
import { verifyVnpayChecksum } from '../vnpay.js';
import GHL from '../ghl.js';

// Khởi tạo instance GHL
const ghl = new GHL(process.env.GHL_TOKEN, process.env.ALT_ID);

// Hàm tạo invoice trong GHL
async function createInvoiceInGHL({ contactId, amount, description, payDate }) {
  try {
    const response = await ghl.createIntegrationProvider({
      contactId,
      amount,
      description,
      payDate,
    });
    return response.data;
  } catch (error) {
    console.error('Lỗi tạo invoice trong GHL:', error.response?.data || error.message);
    throw error;
  }
}

// Hàm cập nhật contact
async function updateGHLContact(contactId, updateData) {
  try {
    if (!ghl.updateContact) {
      throw new Error('GHL class chưa có method updateContact');
    }
    const response = await ghl.updateContact(contactId, updateData);
    return response.data;
  } catch (error) {
    console.error('Lỗi cập nhật contact:', error.response?.data || error.message);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed for VNPAY IPN' });
  }

  try {
    const vnpParams = { ...req.query };

    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    const isValid = verifyVnpayChecksum(vnpParams, secureHash);
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
      return res.status(200).json({ message: 'Giao dịch không thành công. Không gửi vào GHL.' });
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

    return res.status(200).json({ message: 'Đã xử lý VNPAY IPN và cập nhật vào GHL' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
