// Define defaults
const defaultApiHost = 'https://api.height.app';
const defaultWebHost = 'https://height.app';

// Define env
const env = {
  apiHost: process.env.HEIGHT_API_HOST || defaultApiHost,
  webHost: process.env.HEIGHT_WEB_HOST || defaultWebHost,
};

export const overrideHosts = (hosts: {apiHost?: string; webHost?: string}) => {
  if (hosts.apiHost) {
    env.apiHost = hosts.apiHost;
  }

  if (hosts.webHost) {
    env.webHost = hosts.webHost;
  }
};

export default env as Readonly<typeof env>;
