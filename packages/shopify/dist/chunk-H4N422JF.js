// ../../node_modules/.pnpm/uncrypto@0.1.3/node_modules/uncrypto/dist/crypto.node.mjs
import nodeCrypto from "crypto";
var subtle = nodeCrypto.webcrypto?.subtle || {};
var randomUUID = () => {
  return nodeCrypto.randomUUID();
};
var getRandomValues = (array) => {
  return nodeCrypto.webcrypto.getRandomValues(array);
};
var _crypto = {
  randomUUID,
  getRandomValues,
  subtle
};

export {
  subtle,
  randomUUID,
  getRandomValues,
  _crypto
};
