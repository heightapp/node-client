import createTokens from 'authentication/createTokens';
import openAuthentication from 'authentication/openAuthentication';
import endpoints, {Endpoint, EndpointsInterface} from 'endpoints';
import env, {overrideHosts} from 'env';
import ClientError, {ClientErrorCode} from 'helpers/clientError';
import request from 'helpers/request';
import setTimeoutAsync from 'helpers/setTimeoutAsync';
import {Response} from 'node-fetch';
import {DeepReadonly} from 'types/deepReadOnly';
import {Logger} from 'types/logger';

const EXPIRY_OFFSET = 2 * 60 * 1000; // 2 mins - to account for any request/other delay and be safe
const MAX_RETRY = 3;
const RETRY_DELAY = 1000;

type ClientOptions = {
  refreshToken: string;
  clientId: string;
  redirectUri: string;
  scopes: Array<string>;
  logger?: Logger;
};

export interface Client extends DeepReadonly<EndpointsInterface> {}
export class Client {
  static setupHostsForDev = (hosts: {webHost: string; apiHost: string}) => {
    overrideHosts(hosts);
  };

  static openAuthentication = openAuthentication;
  static createTokens = createTokens;

  private logger?: Logger;
  private authInfo: {
    clientId: string;
    redirectUri: string;
    scopes: Array<string>;
  };
  private credentials: {
    refreshToken: string;
    accessToken?: string;
    expiresAt?: number;
  };

  constructor(options: ClientOptions) {
    this.authInfo = {
      clientId: options.clientId,
      redirectUri: options.redirectUri,
      scopes: options.scopes,
    };

    this.credentials = {
      refreshToken: options.refreshToken,
    };

    this.logger = options.logger;

    this.initializeEndpoints(this, null, endpoints);
  }

  private initializeEndpoints = (root: any, key: string | null, endpoint: Endpoint<any> | object) => {
    if ('path' in endpoint && key) {
      // eslint-disable-next-line no-param-reassign
      root[key] = async (...args: any) => {
        const {data} = await this.request(
          endpoint.path,
          {
            ...endpoint.prepare?.apply(this, args),
            method: endpoint.method,
          },
          {
            retry: 0,
            skipAuthentication: endpoint.skipAuthentication,
            logger: this.logger,
          },
        );

        return endpoint.finalize?.(data) ?? data;
      };
    } else {
      if (key) {
        // eslint-disable-next-line no-param-reassign
        root[key] = {};
      }

      const newRoot = key ? root[key] : root;
      const subkeys = Object.keys(endpoint);
      for (let i = 0; i < subkeys.length; i++) {
        const subkey = subkeys[i];
        this.initializeEndpoints(newRoot, subkey, (endpoint as any)[subkey]);
      }
    }
  };

  private refreshAccessToken = async () => {
    try {
      const {refreshToken, accessToken, expiresAt} = await this.auth.refresh({
        clientId: this.authInfo.clientId,
        redirectUri: this.authInfo.redirectUri,
        scopes: this.authInfo.scopes,
        refreshToken: this.credentials.refreshToken,
      });

      this.credentials = {
        refreshToken,
        accessToken,
        expiresAt,
      };
    } catch (e) {
      if (e instanceof ClientError) {
        if (e.status >= 400 && e.status < 500) {
          throw new ClientError({
            code: ClientErrorCode.RefreshTokenInvalid,
            message: e.message,
            path: e.path,
            status: e.status,
          });
        }
      }

      throw e;
    }
  };

  request = async <Data extends object>(
    path: string,
    options?: Parameters<typeof request>[1],
    customOptions?: {
      retry?: number;
      skipAuthentication?: boolean;
      logger?: Logger;
    },
  ): Promise<{response: Response; data: Data}> => {
    const {retry, skipAuthentication} = {...{retry: 0}, ...customOptions};

    if (retry > MAX_RETRY) {
      throw new ClientError({
        message: 'Maximum client retry reached.',
        code: ClientErrorCode.MaximumRetryReached,
        path,
        status: 429,
      });
    }

    // Refresh token if we don't have one or expired
    if (!skipAuthentication && (!this.credentials.accessToken || !this.credentials.expiresAt || this.credentials.expiresAt < Date.now() + EXPIRY_OFFSET)) {
      await this.refreshAccessToken();
      return this.request(path, options, {
        ...customOptions,
        retry: retry + 1,
      });
    }

    // Create url
    const url = (() => {
      const u = new URL(env.apiHost);
      u.pathname = path;
      return u.href;
    })();

    const headers: HeadersInit = {};

    if (!skipAuthentication && this.credentials.accessToken) {
      headers.Authorization = `Bearer ${this.credentials.accessToken}`;
    }

    // Execute request
    const response = await request(
      url,
      {
        ...options,
        headers: {
          ...options?.headers,
          ...headers,
        },
      },
      {
        logger: customOptions?.logger,
      },
    );

    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (response.status === 401) {
      if (data?.error?.type === 'authtokenexpired') {
        // Refresh token
        await this.refreshAccessToken();
        return this.request<Data>(path, options, {
          ...customOptions,
          retry: retry + 1,
        });
      }

      // Invalid credentials
      throw new ClientError({
        code: ClientErrorCode.RefreshTokenInvalid,
        message: response.statusText,
        path,
        status: response.status,
      });
    }

    if (response.status >= 200 && response.status < 300) {
      return {
        response,
        data: data as Data, // Optimistically accept the data that has been returned
      };
    }

    if (response.status === 503) {
      const retryAfter = parseInt(response.headers.get('retry-after') ?? '', 10);
      return setTimeoutAsync(isNaN(retryAfter) ? RETRY_DELAY : retryAfter).then(() => {
        return this.request<Data>(path, options, {
          ...customOptions,
          retry: retry + 1,
        });
      });
    }

    throw new ClientError({
      code: ClientErrorCode.Unclassified,
      message: data?.error?.message ?? 'Something weird happened. Please try again.',
      path,
      status: response.status,
    });
  };
}
