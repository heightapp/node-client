export interface EndpointsInterface {
  auth: {
    refresh: (body: {clientId: string; redirectUri: string; refreshToken: string; scopes: Array<string>}) => Promise<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    }>;
    revoke: (refreshToken: string) => Promise<void>;
  };
  view: {
    default: {
      get: () => Promise<{
        id: string;
      }>;
    };
  };
  task: {
    create: (body: {name: string; listIds?: Array<string>; assigneesIds?: Array<string>}) => Promise<{
      index: number;
      name: string;
    }>;
  };
  user: {
    get: () => Promise<{
      id: string;
      email: string;
    }>;
  };
  userPreference: {
    get: () => Promise<{
      preferences: {
        defaultListIds?: Array<string>;
      };
    }>;
  };
}

export type Endpoint<Fn extends (...args: any) => any> = {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  prepare?: (...args: Parameters<Fn>) => {
    body?: object;
  };
  finalize?: (data: any) => object;
  skipAuthentication?: boolean;
};

type Endpoints<E> = {
  [Property in keyof E]: E[Property] extends (...args: any) => any ? Endpoint<E[Property]> : Endpoints<E[Property]>;
};

const endpoints: Endpoints<EndpointsInterface> = {
  auth: {
    refresh: {
      path: '/oauth/tokens',
      method: 'POST',
      prepare: (body) => {
        return {
          body: {
            client_id: body.clientId,
            redirect_uri: body.redirectUri,
            refresh_token: body.refreshToken,
            grant_type: 'refresh_token',
            scope: body.scopes,
          },
        };
      },
      finalize: (data) => {
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(data.expires_at).getTime(),
        };
      },
      skipAuthentication: true,
    },
    revoke: {
      path: 'oauth/tokens/revoke',
      method: 'POST',
      prepare: (refreshToken) => {
        return {
          body: {
            token: refreshToken,
            token_type_hint: 'refresh_token',
          },
        };
      },
      skipAuthentication: true,
    },
  },
  view: {
    default: {
      get: {
        path: 'lists/default',
        method: 'GET',
      },
    },
  },
  task: {
    create: {
      path: 'tasks',
      method: 'POST',
      prepare: (body) => {
        return {
          body,
        };
      },
    },
  },
  user: {
    get: {
      path: 'users/me',
      method: 'GET',
    },
  },
  userPreference: {
    get: {
      path: 'users/me/preferences',
      method: 'GET',
    },
  },
};

export default endpoints;
