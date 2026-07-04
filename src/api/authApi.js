import client from './client';

export const authAPI = {
  login:         (data) => client.post('/auth/login', data),
  register:      (data) => client.post('/auth/register', data),
  refresh:       ()     => client.post('/auth/refresh'),
  logout:        ()     => client.post('/auth/logout'),
  resetPassword: (data) => client.post('/auth/reset-password', data),
  getProfile:    ()     => client.get('/users/me'),
  updateProfile: (data) => client.put('/users/me', data),
  changePassword:(data) => client.put('/users/change-password', data),
};
