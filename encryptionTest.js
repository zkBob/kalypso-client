import { assert } from "ethers";
import {
  encrypt,
  decrypt,
  getPubKey,
  MARKET_ID,
  bigNumberishToBuffer,
} from "./utils.js";
const data = bigNumberishToBuffer(BigInt(123));

export const encryptDecryptTest = (skStr) => {
  const publicKey = getPubKey(skStr);
  const { acl, encryptedData } = encrypt(data, publicKey, MARKET_ID);
  const decrypted = decrypt(skStr, acl, encryptedData, MARKET_ID);
  assert(decrypted.compare(data) == 0);
  console.log(
    `encryptDecryptTest  ${decrypted.compare(data) == 0 ? "OK" : "FAILED"}`,
  );
};
