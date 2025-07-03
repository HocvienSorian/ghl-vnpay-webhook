import { verifyVnpResponse } from '../vnpay.js';
import { createInvoiceInGHL, updateGHLContact } from '../ghl.js';

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
      return res.status(200).json({ message: 'Giao dịch thất bại' });
    }

    const amount = parseInt(vnpParams.vnp_Amount, 10) / 100;
    await createInvoiceInGHL({
      contactId: vnpParams.vnp_OrderInfo,
      amount,
      description: `Thanh toán đơn hàng #${vnpParams.vnp_TxnRef}`,
      payDate: vnpParams.vnp_PayDate,
    });

    await updateGHLContact(vnpParams.vnp_OrderInfo, {
      tags: ['Đã thanh toán VNPAY'],
    });

    return res.status(200).json({ message: '✅ Giao dịch thành công' });
  } catch (err) {
    console.error('❌ Lỗi xử lý webhook:', err);
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
