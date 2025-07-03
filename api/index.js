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

    // ✅ Fix: lấy contactId từ OrderInfo nếu hợp lệ, fallback entityId nếu cần
    const contactId = vnpParams.vnp_OrderInfo || vnpParams.vnp_TransactionNo;
    if (!contactId || contactId.startsWith('ThanhtoantuGHL')) {
      throw new Error('❌ contactId không hợp lệ, cần ID thực từ GHL');
    }

    const amount = parseInt(vnpParams.vnp_Amount, 10) / 100;
    const payDate = vnpParams.vnp_PayDate;

    console.log('🧾 Gửi createInvoiceInGHL:', { contactId, amount, payDate });

    await createInvoiceInGHL({
      contactId,
      amount,
      description: `Thanh toán đơn hàng #${vnpParams.vnp_TxnRef}`,
      payDate,
    });

    console.log('🏷️ Cập nhật tag contact');
    await updateGHLContact(contactId, {
      tags: ['Đã thanh toán VNPAY'],
    });

    return res.status(200).json({ message: '✅ Đã xử lý VNPAY IPN thành công' });
  } catch (err) {
    console.error('❌ Lỗi xử lý webhook:', err);
    return res.status(500).json({ error: 'Lỗi xử lý webhook', details: err.message });
  }
}
