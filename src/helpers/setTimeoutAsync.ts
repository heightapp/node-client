const setTimeoutAsync = (timeout: number): Promise<void> & {cancel: () => void} => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const promise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, timeout);
  });

  // @ts-ignore
  promise.cancel = () => {
    timeoutId && clearTimeout(timeoutId);
  };

  // @ts-ignore
  return promise;
};

export default setTimeoutAsync;
