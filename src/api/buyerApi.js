import client from './client';
export const buyerAPI = {
  search:       (q)         => client.get('/buyers/search', { params: { q } }),
  getAll:       (params)    => client.get('/buyers', { params }),
  getById:      (id)        => client.get(`/buyers/${id}`),
  findOrCreate: (data)      => client.post('/buyers', data),
  update:       (id, data)  => client.put(`/buyers/${id}`, data),
  remove:       (id)        => client.delete(`/buyers/${id}`),
};
