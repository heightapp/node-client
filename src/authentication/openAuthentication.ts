import pkceChallenge from 'authentication/helpers/pkceChallenge';
import env from 'env';
import ClientError, {ClientErrorCode} from 'helpers/clientError';
import setTimeoutAsync from 'helpers/setTimeoutAsync';
import switchImpossibleCase from 'helpers/switchImpossibleCase';
import {Logger} from 'types/logger';

import getAuthorizationCode, {AUTHORIZATION_CODE_PATH_NAME} from './helpers/getAuthorizationCode';
import getAuthorizationCodeKeys from './helpers/getAuthorizationCodeKeys';

type AuthenticateBaseParams = {
  clientId: string;
  redirectUri: string;
  scopes: Array<string>;
  state?: object;
  logger?: Logger;
  onOpenUrl: (url: string) => void;
};

type AuthenticateServerParams = AuthenticateBaseParams & {
  source: 'server';
  clientSecret: string;
};

type AuthenticateClientHandledParams = AuthenticateBaseParams & {
  source: 'client';
  handleViaRedirectUri: true;
};

type AuthenticateClientNotHandledParams = AuthenticateBaseParams & {
  source: 'client';
  handleViaRedirectUri: false;
};

type AuthenticateParams = AuthenticateServerParams | AuthenticateClientHandledParams | AuthenticateClientNotHandledParams;

const OAUTH_PATH_NAME = 'oauth/authorization';
const POLL_AUTHORIZATION_CODE_INTERVAL = 3000;
const POLL_AUTHORIZATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const createOAuthInfo = async (params: AuthenticateParams) => {
  const url = new URL(env.webHost);
  url.pathname = OAUTH_PATH_NAME;
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('scope', `[${params.scopes.join(',')}]`);

  switch (params.source) {
    case 'server': {
      // Set client secret
      url.searchParams.set('client_secret', params.clientSecret);

      // Set state
      if (params.state) {
        url.searchParams.set('state', JSON.stringify(params.state));
      }

      return {url};
    }
    case 'client': {
      // Add code verifier
      const {codeVerifier, codeChallenge} = pkceChallenge();
      url.searchParams.set('code_challenge', codeChallenge);
      url.searchParams.set('code_challenge_method', 'S256');

      let state: any = params.state;
      let authorizationKeys: {readKey: string; writeKey: string} | undefined;

      // Get read/write keys and add to state if needed
      if (!params.handleViaRedirectUri) {
        authorizationKeys = await getAuthorizationCodeKeys({logger: params.logger});
        state = {
          ...state,
          writeKey: authorizationKeys.writeKey,
        };
      }

      // Set state
      url.searchParams.set('state', JSON.stringify(state));
      return {url, authorizationKeys, codeVerifier, codeChallenge};
    }
    default: {
      switchImpossibleCase(params);
      throw new ClientError({
        message: 'Bad request',
        path: OAUTH_PATH_NAME,
        status: 400,
        code: ClientErrorCode.Unclassified,
      });
    }
  }
};

const pollAuthorizationCode = (readKey: string, logger?: Logger) => {
  return new Promise<string>((resolve, reject) => {
    setTimeout(async () => {
      try {
        const {code} = await getAuthorizationCode({readKey, logger});
        resolve(code);
      } catch (e) {
        if (e instanceof ClientError && e.code === ClientErrorCode.MissingData) {
          // Retry
          resolve(pollAuthorizationCode(readKey, logger));
        } else {
          reject(e);
        }
      }
    }, POLL_AUTHORIZATION_CODE_INTERVAL);
  });
};

async function openAuthentication(params: AuthenticateServerParams): Promise<null>;
async function openAuthentication(params: AuthenticateClientHandledParams): Promise<{codeVerifier: string}>;
async function openAuthentication(params: AuthenticateClientNotHandledParams): Promise<{code: string; codeVerifier: string}>;
async function openAuthentication(params: AuthenticateParams) {
  // Create oauth info
  const info = await createOAuthInfo(params);

  // Open url in browser
  params.logger?.info('Open oauth url in browser');
  params.onOpenUrl(info.url.href);

  if (params.source === 'client' && params.handleViaRedirectUri) {
    return {codeVerifier: info.codeVerifier};
  }

  // Poll for the code if we're getting it with keys
  if (params.source === 'client' && info.authorizationKeys) {
    const timeoutPromise = setTimeoutAsync(POLL_AUTHORIZATION_TIMEOUT);
    timeoutPromise.then(() => {
      throw new ClientError({
        message: 'Authentication timeout',
        path: AUTHORIZATION_CODE_PATH_NAME,
        status: 408,
        code: ClientErrorCode.Timeout,
      });
    });
    const codePromise = pollAuthorizationCode(info.authorizationKeys.readKey);

    const result = await Promise.any([codePromise, timeoutPromise]);
    timeoutPromise.cancel();
    return {code: result, codeVerifier: info.codeVerifier};
  }

  return null;
}

export default openAuthentication;
