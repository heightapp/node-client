import env from 'env';
import ClientError, {ClientErrorCode} from 'helpers/clientError';
import request from 'helpers/request';
import {Logger} from 'types/logger';

type CreateTokensParams = {
  clientId: string;
  redirectUri: string;
  scopes: Array<string>;
  code: string;
  logger?: Logger;
} & (
  | {
      clientSecret: string;
    }
  | {
      codeVerifier: string;
    }
);

const createTokens = async (params: CreateTokensParams) => {
  const url = new URL(env.apiHost);
  url.pathname = 'oauth/tokens';

  const body: any = {
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    grant_type: 'authorization_code',
    scope: params.scopes,
    code: params.code,
  };

  if ('codeVerifier' in params) {
    body.code_verifier = params.codeVerifier;
  }

  if ('clientSecret' in params) {
    body.client_secret = params.clientSecret;
  }

  const response = await request(
    url.href,
    {
      method: 'POST',
      body,
    },
    {
      logger: params.logger,
    },
  );

  if (response.status < 200 || response.status >= 300) {
    throw new ClientError({
      message: response.statusText,
      path: url.pathname,
      status: response.status,
      code: ClientErrorCode.Unclassified,
    });
  }

  const data = (await response.json()) as any;

  return {
    accessToken: data.access_token as string,
    refreshToken: data.refresh_token as string,
    expiresAt: new Date(data.expires_at).getTime(),
  };
};

export default createTokens;
