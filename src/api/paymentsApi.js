import client from './client';
export const paymentsAPI = {
  getAll:   (params)    => client.get('/payments', { params }),
  getById:  (id)        => client.get(`/payments/${id}`),
  create:   (data)      => client.post('/payments', data),
  update:   (id, data)  => client.put(`/payments/${id}`, data),
  remove:   (id)        => client.delete(`/payments/${id}`),
  getStats: ()          => client.get('/payments/stats'),
};
