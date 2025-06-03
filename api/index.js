// File: /api/index.js
import { verifyVnpayChecksum } from '../vnpay.js';
import GHL from '../ghl.js';

// Kiểm tra biến môi trường quan trọng trước khi khởi tạo GHL
const GHL_ACCESS_TOKEN = process.env.GHL_ACCESS_TOKEN;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

if (!GHL_ACCESS_TOKEN || !GHL_LOCATION_ID) {
  console.error('Thiếu biến môi trường GHL_ACCESS_TOKEN hoặc GHL_LOCATION_ID');
  // Có thể dừng server hoặc throw lỗi tùy trường hợp
}

const ghl = new GHL(GHL_ACCESS_TOKEN, GHL_LOCATION_ID);

// Hàm tạo hóa đơn (invoice) trong GHL
async function createInvoiceInGHL({ contactId, amount, description, payDate }) {
  try {
    // Giả định GHL có method createInvoice (bạn thay tên nếu khác)
    const response = await ghl.createInvoice({
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

// Hàm cập nhật thông tin contact trong GHL
async function updateGHLContact(contactId, updateData) {
  try {
    if (typeof ghl.updateContact !== 'function') {
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
  // VNPAY IPN có thể là GET hoặc POST, bạn có thể tùy chỉnh theo thực tế
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Chỉ cho phép phương thức GET hoặc POST cho VNPAY IPN' });
  }

  try {
    // IPN gửi dữ liệu có thể nằm ở req.query hoặc req.body tùy server
    // Nếu bạn dùng GET thì req.query, POST có thể req.body
    // Ở đây giả sử IPN dùng GET nên lấy req.query
    const vnpParams = { ...req.query };

    const secureHash = vnpParams.vnp_SecureHash;
    if (!secureHash) {
      return res.status(400).json({ error: 'Thiếu tham số vnp_SecureHash' });
    }

    // Xóa để không ảnh hưởng khi verify checksum
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

    // Nếu giao dịch không thành công, không làm gì thêm
    if (vnp_ResponseCode !== '00') {
      return res.status(200).json({ message: 'Giao dịch không thành công. Không cập nhật vào GHL.' });
    }

    const customerId = vnp_OrderInfo; // Lấy customerId từ OrderInfo (cần bạn kiểm tra đúng logic)

    // Tạo invoice trong GHL
    await createInvoiceInGHL({
      contactId: customerId,
      amount: parseInt(vnp_Amount, 10) / 100, // VNPAY gửi tiền tính bằng VND * 100
      description: `Thanh toán đơn hàng #${vnp_TxnRef}`,
      payDate: vnp_PayDate,
    });

    // Cập nhật contact với tag
    await updateGHLContact(customerId, {
      tags: ['Đã thanh toán VNPAY'],
    });

    return res.status(200).json({ message: 'Đã xử lý VNPAY IPN và cập nhật vào GHL' });
  } catch (error) {
    console.error('Lỗi xử lý webhook:', error);
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
