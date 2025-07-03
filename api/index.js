import { verifyVnpResponse } from '../vnpay.js';
import { createInvoiceInGHL, updateGHLContact, fetchLatestTransaction } from '../ghl.js';

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

    if (!contactId || contactId.length < 10) {
      console.error('❌ contactId không hợp lệ:', contactId);
      return res.status(400).json({ error: 'contactId không hợp lệ, không thể tạo hóa đơn' });
    }

    console.log('🧾 Gửi createInvoiceInGHL:', { contactId, amount, payDate });

    const invoiceRes = await createInvoiceInGHL({
      contactId,
      amount,
      description: `Thanh toán đơn hàng #${vnpParams.vnp_TxnRef}`,
      payDate,
    });

    console.log('✅ Invoice created:', invoiceRes);

    console.log('🏷️ Cập nhật tag contact');
    await updateGHLContact(contactId, {
      tags: ['Đã thanh toán VNPAY'],
    });

    return res.status(200).json({ message: '✅ Đã xử lý VNPAY IPN thành công' });
  } catch (err) {
    console.error('❌ Lỗi xử lý webhook:', err);
    const statusCode = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    return res.status(statusCode).json({ error: 'Lỗi xử lý webhook', details: message });
  }
}
