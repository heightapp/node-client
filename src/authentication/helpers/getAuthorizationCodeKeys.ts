import env from 'env';
import ClientError, {ClientErrorCode} from 'helpers/clientError';
import request from 'helpers/request';
import {Logger} from 'types/logger';

type GetAuthorizationCodeKeysParams = {
  logger?: Logger;
};

const getAuthorizationCodeKeys = async (params?: GetAuthorizationCodeKeysParams) => {
  const url = new URL(env.apiHost);
  url.pathname = 'integrations/getKeys';

  const response = await request(
    url.href,
    {
      method: 'GET',
    },
    {
      logger: params?.logger,
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
    readKey: data.readKey as string,
    writeKey: data.writeKey as string,
  };
};

export default getAuthorizationCodeKeys;
