import axios from 'axios';
import { apiRequest, apiRequestAuth } from './api-requests';

jest.mock('axios');

const url = 'https://example.com';
const method = 'get';

describe('apiRequest', () => {
  it('should make a request with the correct parameters', async () => {
    const data = { key: 'value' };

    await apiRequest(url, method, data);

    expect(axios).toHaveBeenCalledWith({
      method,
      url,
      data,
    });

    expect(axios.defaults.headers.common).toMatchSnapshot();
  });

  it('should make a request with the correct parameters and default data', async () => {
    const data = {};
    await apiRequest(url, method);

    expect(axios).toHaveBeenCalledWith({
      method,
      url,
      data,
    });

    expect(axios.defaults.headers.common).toMatchSnapshot();
  });
});

describe('apiRequestAuth', () => {
  const token = 'yourAuthToken';

  it('should make an authenticated request with the correct parameters', async () => {
    const data = { key: 'value' };

    await apiRequestAuth(url, method, token, data);

    expect(axios).toHaveBeenCalledWith({
      method,
      url,
      data,
    });

    expect(axios.defaults.headers.common).toMatchSnapshot();
  });

  it('should make an authenticated request with the correct parameters and default data', async () => {
    const data = {};

    await apiRequestAuth(url, method, token);

    expect(axios).toHaveBeenCalledWith({
      method,
      url,
      data,
    });

    expect(axios.defaults.headers.common).toMatchSnapshot();
  });
});
