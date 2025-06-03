import { verifyVnpayChecksum } from '../vnpay.js';
import { updateGHLContact, createInvoiceInGHL } from '../ghl.js';
import qs from 'qs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed for VNPAY IPN' });
  }

  try {
    const vnpParams = req.query;

    // 1. Tách checksum ra để xác minh
    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // 2. Xác minh checksum
    const isValid = verifyVnpayChecksum(vnpParams, secureHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Checksum không hợp lệ' });
    }

    // 3. Lấy thông tin từ VNPAY
    const {
      vnp_TxnRef,       // Mã đơn hàng
      vnp_Amount,       // Số tiền
      vnp_OrderInfo,    // Ghi chú / mã khách hàng GHL
      vnp_ResponseCode, // "00" là thành công
      vnp_PayDate       // Ngày thanh toán
    } = vnpParams;

    if (vnp_ResponseCode !== '00') {
      return res.status(200).json({ message: 'Giao dịch không thành công. Không gửi vào GHL.' });
    }

    // 4. Gửi sang GHL (ví dụ: tạo hóa đơn hoặc cập nhật tag)
    const customerId = vnp_OrderInfo; // vnp_OrderInfo là ID contact trong GHL (hoặc email/sdt tùy bạn)

    // 4.1 Tạo invoice trong GHL (nếu có)
    await createInvoiceInGHL({
      contactId: customerId,
      amount: parseInt(vnp_Amount) / 100, // VNPAY nhân 100
      description: `Thanh toán đơn hàng #${vnp_TxnRef}`,
      payDate: vnp_PayDate,
    });

    // 4.2 Cập nhật tag contact là "Đã thanh toán"
    await updateGHLContact(customerId, {
      tags: ['Đã thanh toán VNPAY'],
    });

    res.status(200).json({ message: 'Đã xử lý VNPAY IPN và cập nhật vào GHL' });
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
