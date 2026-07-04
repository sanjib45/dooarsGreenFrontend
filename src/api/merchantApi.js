import client from './client';

export const merchantAPI = {
  getAll:   (params)     => client.get('/merchant', { params }),
  getById:  (id)         => client.get(`/merchant/${id}`),
  create:   (data)       => client.post('/merchant', data),
  update:   (id, data)   => client.put(`/merchant/${id}`, data),
  remove:   (id)         => client.delete(`/merchant/${id}`),
  getStats: ()           => client.get('/merchant/stats'),
};

// Default export kept for backward compatibility (other api files that imported this)
export default client;
