// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (...args: any) => any ? T[P] : DeepReadonly<T[P]>;
}
