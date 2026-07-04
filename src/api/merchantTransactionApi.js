import client from './client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

export const merchantTxnAPI = {
  getAll:   (params)       => client.get('/merchant-transactions', { params }),
  getById:  (id)           => client.get(`/merchant-transactions/${id}`),
  getStats: ()             => client.get('/merchant-transactions/stats'),
  create:   (data)         => client.post('/merchant-transactions', data),
  update:   (id, data)     => client.put(`/merchant-transactions/${id}`, data),
  remove:   (id)           => client.delete(`/merchant-transactions/${id}`),

  // ── Client-side calculation mirror (instant UI preview, no network) ───
  compute: (d) => {
    const grossQty             = Number(d.grossQty)             || 0;
    const lessPercent          = Number(d.lessPercent)          || 0;
    const ratePerKg            = Number(d.ratePerKg)            || 0;
    const laborCount           = Number(d.laborCount)           || 0;
    const laborChargePerWorker = Number(d.laborChargePerWorker) || 0;
    const advancePayment       = Number(d.advancePayment)       || 0;

    const r2 = (n) => Math.round(n * 100) / 100;

    const lessQty           = r2(grossQty * (lessPercent / 100));
    const netQty            = r2(grossQty - lessQty);
    const grossAmount       = r2(netQty * ratePerKg);
    const totalLaborCharges = r2(laborCount * laborChargePerWorker);
    const netPayable        = r2(grossAmount - totalLaborCharges);
    const finalPayable      = r2(netPayable - advancePayment);
    const balance           = finalPayable;

    return { lessQty, netQty, grossAmount, totalLaborCharges, netPayable, finalPayable, balance };
  },

  // ── Payments sub-resource ─────────────────────────────────────────────
  getPayments:   (txnId)        => client.get(`/merchant-transactions/${txnId}/payments`),
  addPayment:    (txnId, data)  => client.post(`/merchant-transactions/${txnId}/payments`, data),
  deletePayment: (txnId, payId) => client.delete(`/merchant-transactions/${txnId}/payments/${payId}`),

  // ── Invoice endpoints ─────────────────────────────────────────────────
  invoiceUrlByDate: (merchantName, startDate, endDate) => {
    const token = localStorage.getItem('accessToken') || '';
    return `${BASE_URL}/merchant-transactions/invoice/by-merchant-date?merchantName=${encodeURIComponent(merchantName)}&startDate=${startDate}&endDate=${endDate}&token=${token}`;
  },
  getInvoiceHtmlByDate: (merchantName, startDate, endDate) =>
    client.get('/merchant-transactions/invoice/by-merchant-date', {
      params: { merchantName, startDate, endDate, format: 'html' },
      responseType: 'text',
    }),
  getInvoiceBlob: async (txnId) => {
    const res = await client.get(`/merchant-transactions/${txnId}/invoice`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },
};

export default client;
