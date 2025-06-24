// pages/custom-page.js
import { useState } from 'react';

export default function CustomPaymentConfigPage() {
  const [form, setForm] = useState({
    locationId: '',
    liveApiKey: '',
    livePublishableKey: '',
    testApiKey: '',
    testPublishableKey: '',
  });

  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('⏳ Đang gửi...');

    try {
      const response = await fetch('/api/setup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('✅ Cấu hình thành công!');
      } else {
        setStatus(`❌ Lỗi: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      setStatus('❌ Lỗi không xác định.');
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <h1>Cấu hình GHL Payment Provider</h1>
      <form onSubmit={handleSubmit}>
        {['locationId', 'liveApiKey', 'livePublishableKey', 'testApiKey', 'testPublishableKey'].map((field) => (
          <div key={field} style={{ marginBottom: 10 }}>
            <label>{field}</label>
            <input
              type="text"
              name={field}
              value={form[field]}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: 8 }}
            />
          </div>
        ))}
        <button type="submit" style={{ padding: '10px 20px' }}>
          Gửi cấu hình
        </button>
      </form>
      {status && <p style={{ marginTop: 20 }}>{status}</p>}
    </div>
  );
}
