import {RequestInfo, RequestInit, Response} from 'node-fetch';
import {Logger} from 'types/logger';

type Info = RequestInfo;
type Init = Omit<Exclude<RequestInit, undefined>, 'body'> & {
  body?: object;
};
type CustomOptions = {
  logger?: Logger;
};

const request = async (info: Info, options?: Init, customOptions?: CustomOptions): Promise<Response> => {
  // Dynamic import is supported for both ESM and CJS
  const fetch = (await import('node-fetch')).default;

  const {logger} = customOptions ?? {};
  const method = options?.method ?? 'GET';

  const url = typeof info === 'string' ? info : info.url;
  const pathname = (() => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname;
    } catch {
      return url;
    }
  })();

  // Log request start
  logger?.info(`Start ${method} ${pathname} request`);

  // Execute request
  const response = await fetch(info, {
    ...options,
    headers: {
      ...options?.headers,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  // Log request finished
  if (response.status >= 200 && response.status < 300) {
    logger?.info(`Successful ${method} ${pathname} request`, {
      status: response.status,
    });
  } else {
    logger?.error(`Failed ${method} ${pathname} request`, {
      status: response.status,
    });
  }

  return response;
};

export default request;
