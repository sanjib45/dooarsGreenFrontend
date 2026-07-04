import client from './client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005/api';

export const factoryAPI = {
  getAll:        (params)          => client.get('/factory', { params }),
  getById:       (id)              => client.get(`/factory/${id}`),
  create:        (data)            => client.post('/factory', data),
  update:        (id, data)        => client.put(`/factory/${id}`, data),
  remove:        (id)              => client.delete(`/factory/${id}`),
  getStats:      ()                => client.get('/factory/stats'),
  addPayment:    (id, paymentData) => client.post(`/factory/${id}/payments`, paymentData),
  removePayment: (id, paymentId)   => client.delete(`/factory/${id}/payments/${paymentId}`),

  // ── Invoice ────────────────────────────────────────────────────────────────
  /** Opens factory invoice PDF in a new browser tab */
  getInvoiceBlob: async (id) => {
    const res = await client.get(`/factory/${id}/invoice`, { responseType: 'blob' });
    return URL.createObjectURL(res.data);
  },
  
  /** Opens consolidated factory statement PDF for a buyer */
  getInvoiceBlobByBuyer: async (buyerName) => {
    const res = await client.get('/factory/invoice/by-buyer', { 
      params: { buyerName }, 
      responseType: 'blob' 
    });
    return URL.createObjectURL(res.data);
  },
};
