import client from './client';
export const dashboardAPI = {
  get: () => client.get('/dashboard'),
};
