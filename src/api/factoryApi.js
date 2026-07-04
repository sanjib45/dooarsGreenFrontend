import client from './client';
export const factoryAPI = {
  getAll:        (params)          => client.get('/factory', { params }),
  getById:       (id)              => client.get(`/factory/${id}`),
  create:        (data)            => client.post('/factory', data),
  update:        (id, data)        => client.put(`/factory/${id}`, data),
  remove:        (id)              => client.delete(`/factory/${id}`),
  getStats:      ()                => client.get('/factory/stats'),
  addPayment:    (id, paymentData) => client.post(`/factory/${id}/payments`, paymentData),
  removePayment: (id, paymentId)   => client.delete(`/factory/${id}/payments/${paymentId}`),
};
