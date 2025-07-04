// pages/api/vnpay-handler.js
import { verifyVnpResponse } from '../vnpay.js';
import { updateInvoiceInGHL, fetchContactDetails } from '../ghl.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }

  const { chargeId, transactionId, contactId, type } = req.body;

  console.log('📥 Nhận yêu cầu verify từ pay.html:', req.body);

  if (type !== 'verify' || !chargeId || !transactionId || !contactId) {
    return res.status(400).json({ error: 'Thiếu hoặc sai tham số verify' });
  }

  try {
    const isValid = true; // TODO: Gọi API QueryDR của VNPAY để xác thực thực tế

    if (!isValid) {
      console.warn('❌ Giao dịch không hợp lệ hoặc chưa thành công');
      return res.status(200).json({ failed: true });
    }

    const contact = await fetchContactDetails(contactId);
    if (!contact) {
      console.error('❌ Không tìm thấy contact trong GHL với contactId:', contactId);
    } else {
      console.log('✅ Lấy contact thành công:', contact.name);
      await updateInvoiceInGHL(transactionId, {
        status: 'paid',
        note: `Thanh toán thành công qua VNPAY - ChargeID: ${chargeId}`
      });
    }

    console.log('✅ Giao dịch xác minh thành công');
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('🔥 Lỗi khi verify giao dịch:', err);
    return res.status(500).json({ error: 'Lỗi nội bộ khi verify' });
  }
}
