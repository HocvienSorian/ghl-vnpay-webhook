// pages/api/vnpay-handler.js
import { verifyVnpResponse } from '../vnpay.js';
import { updateInvoiceInGHL, fetchContactDetails } from '../ghl.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  }

  const { chargeId, transactionId, contactId, entityId, type } = req.body;

  console.log('📥 Nhận yêu cầu verify từ pay.html:', req.body);

  if (type !== 'verify' || !chargeId || !transactionId || !contactId || !entityId) {
    return res.status(400).json({ error: 'Thiếu tham số verify' });
  }

  try {
    // 📝 Giả lập kiểm tra trạng thái giao dịch tại VNPAY
    const isValid = true; // TODO: Gọi API QueryDR thực tế ở đây

    if (!isValid) {
      console.warn('❌ Giao dịch không hợp lệ hoặc chưa thành công');
      return res.status(200).json({ failed: true });
    }

    const contact = await fetchContactDetails(contactId);
    if (!contact) {
      console.error('❌ Không tìm thấy contact trong GHL với contactId:', contactId);
    } else {
      console.log('✅ Lấy contact thành công:', contact.name || '(không có tên)');

      // 🟢 Update invoice với entityId thay vì transactionId
      await updateInvoiceInGHL(entityId, {
        status: 'paid',
        note: `Thanh toán thành công qua VNPAY - ChargeID: ${chargeId}`
      });
    }

    console.log('✅ Giao dịch xác minh thành công');
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('🔥 Lỗi khi verify giao dịch:', err.response?.data || err.message);
    return res.status(500).json({ error: 'Lỗi nội bộ khi verify', details: err.response?.data });
  }
}
