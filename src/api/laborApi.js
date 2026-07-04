import client from './client';
export const laborAPI = {
  getAll:    (params)    => client.get('/labor', { params }),
  getById:   (id)        => client.get(`/labor/${id}`),
  create:    (data)      => client.post('/labor', data),
  update:    (id, data)  => client.put(`/labor/${id}`, data),
  remove:    (id)        => client.delete(`/labor/${id}`),
  getStats:  ()          => client.get('/labor/stats'),
  togglePay: (id)        => client.patch(`/labor/${id}/pay`),
};
