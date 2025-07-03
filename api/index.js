import { verifyVnpResponse } from '../vnpay.js';
import { fetchInvoiceIdByContact, updateInvoiceInGHL } from '../ghl.js';

const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Chỉ hỗ trợ GET hoặc POST' });
  }

  try {
    const { vnp_SecureHash, ...vnpParams } = req.query;
    console.log('📥 VNPAY Callback Params:', vnpParams);

    if (!vnp_SecureHash) {
      return res.status(400).json({ error: 'Thiếu vnp_SecureHash' });
    }

    const isValid = verifyVnpResponse({ ...vnpParams, vnp_SecureHash });
    if (!isValid) {
      return res.status(400).json({ error: 'Chữ ký không hợp lệ' });
    }

    if (vnpParams.vnp_ResponseCode !== '00') {
      return res.status(200).json({ message: 'Giao dịch thất bại từ VNPAY' });
    }

    const amount = parseInt(vnpParams.vnp_Amount, 10) / 100;
    const payDate = vnpParams.vnp_PayDate;
    const contactId = vnpParams.vnp_OrderInfo;

    if (!contactId) {
      console.error('❌ contactId không hợp lệ hoặc không tồn tại:', contactId);
      return res.status(400).json({ error: 'contactId không hợp lệ, không thể cập nhật hóa đơn' });
    }

    console.log('🔍 Tìm invoiceId bằng contactId:', contactId);
    const invoiceId = await fetchInvoiceIdByContact(contactId);
    if (!invoiceId) {
      console.error('❌ Không tìm thấy invoiceId cho contactId:', contactId);
      return res.status(404).json({ error: 'Không tìm thấy hóa đơn để cập nhật' });
    }

    const invoiceData = {
      altId: GHL_LOCATION_ID,
      altType: 'location',
      name: 'Payment Confirmation',
      title: 'INVOICE',
      currency: 'VND',
      description: `Thanh toán đơn hàng #${vnpParams.vnp_TxnRef}`,
      contactId,
      issueDate: payDate,
      dueDate: payDate,
      liveMode: true,
      invoiceItems: [
        {
          name: 'Thanh toán VNPAY',
          description: 'Đơn hàng VNPAY',
          amount,
          qty: 1,
          currency: 'VND',
          type: 'one_time',
          taxInclusive: true
        }
      ]
    };

    console.log('📝 Cập nhật invoice:', { invoiceId, invoiceData });
    await updateInvoiceInGHL(invoiceId, invoiceData);

    return res.status(200).json({ message: '✅ Đã cập nhật hóa đơn thành công' });
  } catch (err) {
    console.error('❌ Lỗi xử lý webhook:', err);
    const statusCode = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    return res.status(statusCode).json({ error: 'Lỗi xử lý webhook', details: message });
  }
}
