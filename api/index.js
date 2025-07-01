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

  delete params['vnp_SecureHash'];
  delete params['vnp_SecureHashType'];

  const sortedParams = sortObject(params);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', VNP_HASHSECRET);
  const calculatedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  console.log('🔐 SecureHash từ VNPAY:', secureHash);
  console.log('🔐 SecureHash tính lại:', calculatedHash);
  console.log('🧾 signData:', signData);

  return secureHash === calculatedHash;
}

export default async function handler(req, res) {
  const isGet = req.method === 'GET';
  const data = isGet ? req.query : req.body;

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { vnp_SecureHash } = data;

    console.log('📥 Nhận từ VNPAY:', data);

    if (!vnp_SecureHash) {
      return res.status(400).json({ error: 'Thiếu vnp_SecureHash' });
    }

    const isValid = verifyVnpResponse(data);

    if (!isValid) {
      return res.status(400).json({ error: 'Sai chữ ký (vnp_SecureHash không khớp)' });
    }

    const {
      vnp_TxnRef,
      vnp_Amount,
      vnp_OrderInfo,
      vnp_ResponseCode,
      vnp_PayDate,
      vnp_TransactionNo,
    } = data;

    const amount = parseInt(vnp_Amount, 10) / 100;

    if (vnp_ResponseCode !== '00') {
      return res.status(200).json({ message: 'Giao dịch thất bại từ phía VNPAY' });
    }

    console.log('✅ Giao dịch thành công:', {
      orderId: vnp_TxnRef,
      amount,
      description: vnp_OrderInfo,
      payDate: vnp_PayDate,
      vnp_TransactionNo,
    });

    // Nếu là IPN thì trả JSON để ngăn retry
    if (!isGet) {
      return res.status(200).json({ RspCode: '00', Message: 'Success' });
    }

    // Nếu là Return URL (hiển thị cho khách)
    return res.status(200).json({ message: '✅ Giao dịch thành công', orderId: vnp_TxnRef, amount });
  } catch (err) {
    console.error('❌ Lỗi xử lý VNPAY:', err);
    return res.status(500).json({ error: 'Lỗi xử lý webhook', message: err.message });
  }
}
