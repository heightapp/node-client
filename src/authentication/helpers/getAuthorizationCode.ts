import env from 'env';
import ClientError, {ClientErrorCode} from 'helpers/clientError';
import request from 'helpers/request';
import {Logger} from 'types/logger';

export const AUTHORIZATION_CODE_PATH_NAME = 'integrations/getCode';

type GetAuthorizationCodeParams = {
  readKey: string;
  logger?: Logger;
};

const getAuthorizationCode = async (params: GetAuthorizationCodeParams): Promise<{code: string}> => {
  const url = new URL(env.apiHost);
  url.pathname = AUTHORIZATION_CODE_PATH_NAME;
  url.searchParams.set('readKey', params.readKey);

  const response = await request(
    url.href,
    {
      method: 'GET',
    },
    {
      logger: params.logger,
    },
  );

  if (response.status < 200 || response.status >= 300) {
    throw new ClientError({
      message: response.status === 404 ? 'Access denied by user' : response.statusText,
      path: url.pathname,
      status: response.status,
      code: response.status === 404 ? ClientErrorCode.AccessDenied : ClientErrorCode.Unclassified,
    });
  }

  const text = await response.text();
  if (!text) {
    // 200 does not mean the code is set for the key yet
    // So we check if we actually received a code or not
    throw new ClientError({
      message: response.statusText,
      path: url.pathname,
      status: response.status,
      code: ClientErrorCode.MissingData,
    });
  }

  const data = JSON.parse(text);
  return {
    code: data.code,
  };
};

export default getAuthorizationCode;
