export enum ClientErrorCode {
  AccessDenied,
  MaximumRetryReached,
  MissingData,
  RefreshTokenInvalid,
  Timeout,
  Unclassified,
}

type ClientErrorParameters = {
  message: string;
  path: string;
  status: number;
  code: ClientErrorCode;
};

export class ClientError extends Error {
  code: ClientErrorCode;
  status: number;
  path: string;

  constructor(parameters: ClientErrorParameters) {
    super(parameters.message);

    this.code = parameters.code;
    this.status = parameters.status;
    this.path = parameters.path;
  }

  toString() {
    return `An error occurred at '${this.path}' (code: ${this.code}) (status: ${this.status}) - ${this.message}`;
  }
}

export default ClientError;
