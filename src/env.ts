import dotenv from 'dotenv';

import path from 'path';
import {fileURLToPath} from 'url';

// Get dirname on ESM and CJS
const dirname = (() => {
  // @ts-ignore
  const url = import.meta?.url;
  if (url) {
    return path.dirname(fileURLToPath(url));
  }

  return __dirname;
})();

// Path from dist/esm/index or dist/cjs/index file
dotenv.config({path: path.resolve(dirname, '../../.env')});

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
