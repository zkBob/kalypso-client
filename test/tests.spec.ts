import { assert } from "chai";
import { encrypt, decrypt, getPubKey, MARKET_ID } from "../src/utils";
import { getRandomValues } from "crypto";

describe("Encryption-Decryption Tests", () => {
  it("should decrypt the same content that was encrypted", () => {
    const data = new Uint8Array(42);
    const sk = new Uint8Array(32);
    getRandomValues(data);
    getRandomValues(sk);
    const skStr = "0x" + Buffer.from(sk).toString("hex");
    const { acl, encryptedSecret } = encrypt(
      Buffer.from(data),
      getPubKey(skStr),
      MARKET_ID,
    );
    assert(
      decrypt(skStr, acl, encryptedSecret, MARKET_ID).equals(Buffer.from(data)),
    );
  });
});
