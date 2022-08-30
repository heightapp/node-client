export enum LoggerLevel {
  info = 'info',
  error = 'error',
  warn = 'warn',
}

export type Logger = {
  log: (level: LoggerLevel, message: string, ...meta: Array<any>) => Logger;
  info: (message: string, ...meta: Array<any>) => Logger;
  error: (message: string, ...meta: Array<any>) => Logger;
  warn: (message: string, ...meta: Array<any>) => Logger;
};
