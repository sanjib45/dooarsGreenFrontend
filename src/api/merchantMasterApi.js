import API from './merchantApi';

export const merchantMasterAPI = {
  search:        (q)        => API.get('/merchants/search', { params: { q } }),
  getAll:        (params)   => API.get('/merchants', { params }),
  getById:       (id)       => API.get(`/merchants/${id}`),
  findOrCreate:  (data)     => API.post('/merchants', data),
  update:        (id, data) => API.put(`/merchants/${id}`, data),
  remove:        (id)       => API.delete(`/merchants/${id}`),

  // ── Advance Payments ─────────────────────────────────────────────────────
  getAdvances:   (merchantId)             => API.get(`/merchants/${merchantId}/advances`),
  createAdvance: (merchantId, data)       => API.post(`/merchants/${merchantId}/advances`, data),
  deleteAdvance: (merchantId, advanceId)  => API.delete(`/merchants/${merchantId}/advances/${advanceId}`),

  // ── Merchant-Level Payments ───────────────────────────────────
  getPayments:      (merchantId)            => API.get(`/merchants/${merchantId}/payments`),
  createPayment:    (merchantId, data)      => API.post(`/merchants/${merchantId}/payments`, data),
  deletePayment:    (merchantId, paymentId) => API.delete(`/merchants/${merchantId}/payments/${paymentId}`),
};
