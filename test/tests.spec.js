"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const utils_1 = require("../src/utils");
describe("Encryption-Decryption Tests", () => {
    it("should decrypt the same content that was encrypted", () => {
        const data = new Uint8Array(42);
        const sk = new Uint8Array(32);
        crypto.getRandomValues(data);
        crypto.getRandomValues(sk);
        const skStr = "0x" + Buffer.from(sk).toString("hex");
        const { acl, encryptedSecret } = (0, utils_1.encrypt)(Buffer.from(data), Buffer.from((0, utils_1.getPubKey)(skStr)), utils_1.MARKET_ID);
        (0, chai_1.assert)((0, utils_1.decrypt)(skStr, acl, encryptedSecret, utils_1.MARKET_ID).equals(Buffer.from(data)));
    });
});
