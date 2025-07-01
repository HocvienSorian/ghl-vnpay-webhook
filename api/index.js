// index.js

import crypto from 'crypto';
import qs from 'qs';

const VNP_HASHSECRET = process.env.VNP_HASHSECRET;

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function verifyVnpResponse(rawParams) {
  const params = { ...rawParams };
  const secureHash = params['vnp_SecureHash'];

  // ❗️Xóa 2 trường không được tính trong chữ ký
  delete params['vnp_SecureHash'];
  delete params['vnp_SecureHashType'];

  const sortedParams = sortObject(params);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', VNP_HASHSECRET);
  const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('✅ So sánh SecureHash:');
  console.log('→ Từ VNPAY:', secureHash);
  console.log('→ Tính lại:', calculatedHash);
  console.log('🧾 signData:', signData);

  return secureHash === calculatedHash;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Chỉ hỗ trợ GET hoặc POST' });
  }

  try {
    const { vnp_SecureHash, vnp_SecureHashType, ...vnpParams } = req.query;

    console.log('📥 Tham số nhận từ VNPAY:', req.query);

    if (!vnp_SecureHash) {
      return res.status(400).json({ error: 'Thiếu vnp_SecureHash' });
    }

    const isValid = verifyVnpResponse(req.query);

    if (!isValid) {
      return res.status(400).json({ error: 'Chữ ký không hợp lệ (sai SecureHash)' });
    }

    const {
      vnp_TxnRef,
      vnp_Amount,
      vnp_OrderInfo,
      vnp_ResponseCode,
      vnp_PayDate,
      vnp_TransactionNo,
    } = vnpParams;

    // ✅ Chuyển số tiền về đơn vị VND
    const amount = parseInt(vnp_Amount, 10) / 100;

    if (vnp_ResponseCode !== '00') {
      console.warn(`❌ Giao dịch thất bại (Mã lỗi: ${vnp_ResponseCode})`);
      return res.status(200).json({ message: 'Giao dịch thất bại từ phía VNPAY' });
    }

    // 🧾 Tại đây bạn có thể xử lý lưu trạng thái vào DB, tạo invoice, cập nhật contact...

    console.log('🎉 Giao dịch thành công!');
    console.log('→ Mã đơn hàng:', vnp_TxnRef);
    console.log('→ Mã giao dịch VNPAY:', vnp_TransactionNo);
    console.log('→ Số tiền:', amount);
    console.log('→ Mô tả:', vnp_OrderInfo);
    console.log('→ Thời gian:', vnp_PayDate);

    // ✅ Trả phản hồi cho VNPAY nếu đây là IPN (server-to-server)
    if (req.url.includes('/vnpay_ipn')) {
      return res.status(200).json({ RspCode: '00', Message: 'Success' });
    }

    // ✅ Trả thông báo cho khách (nếu là Return URL)
    return res.status(200).json({ message: 'Giao dịch thành công', orderId: vnp_TxnRef, amount });
  } catch (error) {
    console.error('🔥 Lỗi xử lý webhook:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: 'Lỗi xử lý webhook' });
  }
}
