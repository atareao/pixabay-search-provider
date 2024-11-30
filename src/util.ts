import GLib from "gi://GLib";

export const uniqueId = () =>
    [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join("");

export const readFile = (path: string): string | undefined => {
    const [ok, data] = GLib.file_get_contents(path);
    if (!ok) {
        return;
    }

    return new TextDecoder().decode(data);
};

export const fileExists = (path: string): boolean =>
    GLib.file_test(path, GLib.FileTest.EXISTS);



/**
 * https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/setInterval
 * https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/clearInterval
 */
export const setInterval = (func: Function, delay: number, ...args: any) => {
  return GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, delay, () => {
    func(...args);
    return GLib.SOURCE_CONTINUE;
  });
};

export const clearInterval = GLib.source_remove;


/**
 * https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/setTimeout
 * https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout
 */
export const setTimeout = (func: Function, delay: number, ...args: any) => {
  return GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, delay, () => {
    func(...args);
    return GLib.SOURCE_REMOVE;
  });
};

export const waiter = (millis: number, query: string) => {
  let timeout_id: any;
  let rejector: any;
  const prom = new Promise((resolve, reject) => {
    rejector = reject;
    timeout_id = setTimeout(() => {
      resolve(query);
    }, millis);
  });
  //prom.abort = () => {
  //  clearTimeout( timeout_id );
  //  rejector( 'aborted' );
  //};
  return prom;
}

