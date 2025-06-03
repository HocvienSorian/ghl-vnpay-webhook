const GHL = require('../ghl.js');
const { verifyVnpayChecksum } = require('../vnpay.js');

// Khởi tạo instance GHL từ biến môi trường
const ghl = new GHL(process.env.GHL_TOKEN, process.env.ALT_ID);

// Hàm tạo invoice trong GHL
async function createInvoiceInGHL({ contactId, amount, description, payDate }) {
  try {
    // Giả sử tạo order (invoice) qua API GHL
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

// Hàm cập nhật contact, thêm tag
async function updateGHLContact(contactId, updateData) {
  try {
    // Ví dụ gọi API update contact (bạn cần viết API tương ứng trong class GHL)
    // Giả sử có method updateContact trong class GHL, nếu chưa có bạn cần tự thêm
    if (!ghl.updateContact) {
      throw new Error('Method updateContact chưa được cài đặt trong GHL class');
    }

    const response = await ghl.updateContact(contactId, updateData);
    return response.data;
  } catch (error) {
    console.error('Lỗi cập nhật contact trong GHL:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method allowed for VNPAY IPN' });
  }

  try {
    const vnpParams = { ...req.query };

    const secureHash = vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHash;
    delete vnpParams.vnp_SecureHashType;

    // Verify checksum
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

    // Tạo hóa đơn
    await createInvoiceInGHL({
      contactId: customerId,
      amount: parseInt(vnp_Amount, 10) / 100,
      description: `Thanh toán đơn hàng #${vnp_TxnRef}`,
      payDate: vnp_PayDate,
    });

    // Cập nhật tag contact
    await updateGHLContact(customerId, {
      tags: ['Đã thanh toán VNPAY'],
    });

    return res.status(200).json({ message: 'Đã xử lý VNPAY IPN và cập nhật vào GHL' });
  } catch (error) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
};
