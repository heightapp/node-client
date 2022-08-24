import env from 'env';
import ClientError, {ClientErrorCode} from 'helpers/clientError';
import request from 'helpers/request';
import isUndefined from 'lodash/isUndefined';
import omitBy from 'lodash/omitBy';

type CreateTokensParams = {
  clientId: string,
  redirectUri: string
  scopes: Array<string>,
  code: string;
  codeVerifier?: string;
}

const createTokens = async (params: CreateTokensParams) => {
  const url = new URL(env.apiHost);
  url.pathname = 'oauth/tokens';

  const response = await request(url.href, {
    method: 'POST',
    body: omitBy({
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
      scope: params.scopes,
      code: params.code,
      code_verifier: params.code,
    }, isUndefined),
  });

  if (response.status < 200 || response.status >= 300) {
    throw new ClientError({
      message: response.statusText,
      path: url.pathname,
      status: response.status,
      code: ClientErrorCode.Unclassified,
    });
  }

  const data = await response.json() as any;

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at).getTime(),
  };
};

export default createTokens;
