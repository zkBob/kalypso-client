import { encryptDecryptTest } from "./encryptionTest.js";
import { testKalypsoEncryption } from "./kalypsoTest.js";
const skStr =
  "0x88767ca275fe356c4aefa1456a343ce70975d6067f1e2ba1d1cc9736746da5b6";
// pubKey 0x04648d10d36856a94fd96b663265d97133e520883b38eb432a3ef24f04c7c26a7cad0ee354a00cd81ae7c1a28971ff510890d9f79b4273475c2bd9fb23f093725f;
encryptDecryptTest(skStr);
testKalypsoEncryption(skStr);
