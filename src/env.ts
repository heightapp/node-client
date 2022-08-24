import dotenv from 'dotenv';

import path from 'path';
import {fileURLToPath} from 'url';

// Get dirname on ESM and CJS
const dirname = (() => {
  // @ts-ignore
  const url = import.meta?.url;
  if (url) {
    return path.dirname(fileURLToPath(url));
  }

  return __dirname;
})();

// Path from dist/esm/index or dist/cjs/index file
dotenv.config({path: path.resolve(dirname, '../../.env')});

// Define env
const env = {};

export default env;
