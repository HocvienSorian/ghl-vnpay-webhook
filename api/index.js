import { verifyVnpResponse } from '../vnpay.js';
import { updateInvoiceInGHL, fetchContactDetails } from '../ghl.js';

const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

function formatDate(yyyymmddHHMMSS) {
  return `${yyyymmddHHMMSS.slice(0, 4)}-${yyyymmddHHMMSS.slice(4, 6)}-${yyyymmddHHMMSS.slice(6, 8)}`;
}

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
    const invoiceId = vnpParams.vnp_OrderInfo;

    if (!invoiceId) {
      console.error('❌ Không tìm thấy invoiceId trong vnp_OrderInfo');
      return res.status(400).json({ error: 'Không tìm thấy invoiceId để cập nhật' });
    }

    // 🟢 Lấy thông tin contact từ GHL
    const contact = await fetchContactDetails(invoiceId);

    if (!contact) {
      console.error('❌ Không lấy được thông tin contact từ GHL.');
      return res.status(500).json({ error: 'Không lấy được thông tin contact để cập nhật invoice' });
    }

    const invoiceData = {
      altId: GHL_LOCATION_ID,
      altType: 'location',
      name: 'Payment Confirmation',
      title: 'INVOICE',
      currency: 'VND',
      description: `Thanh toán đơn hàng #${vnpParams.vnp_TxnRef}`,
      issueDate: formatDate(payDate),
      dueDate: formatDate(payDate),
      liveMode: true,
      businessDetails: {
        name: 'Sorian',
        address: {
          addressLine1: '722 S PECK STREET',
          city: 'SHINER',
          state: 'TX',
          countryCode: 'US',
          postalCode: '77984'
        },
        phoneNo: '+17374449922',
        website: 'www.sorianmarketing.com'
      },
      contactDetails: {
        id: contact.id,
        name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email: contact.email,
        phoneNo: contact.phone,
        companyName: contact.companyName || '',
        address: {
          addressLine1: contact.address?.address1 || '',
          addressLine2: contact.address?.address2 || '',
          city: contact.address?.city || '',
          state: contact.address?.state || '',
          countryCode: contact.address?.country || '',
          postalCode: contact.address?.postalCode || ''
        }
      },
      discount: {
        value: 0,
        type: 'percentage'
      },
      invoiceItems: [
        {
          name: 'Thanh toán VNPAY',
          description: 'Đơn hàng VNPAY',
          amount,
          qty: 1,
          currency: 'VND',
          type: 'one_time',
          taxInclusive: true
        }
      ]
    };

    console.log('📝 Cập nhật invoice với dữ liệu:', JSON.stringify(invoiceData, null, 2));
    await updateInvoiceInGHL(invoiceId, invoiceData);

    return res.status(200).json({ message: '✅ Đã cập nhật hóa đơn thành công' });
  } catch (err) {
    console.error('❌ Lỗi xử lý webhook:', err);
    const statusCode = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    return res.status(statusCode).json({ error: 'Lỗi xử lý webhook', details: message });
  }
}

