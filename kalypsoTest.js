import { ethers, Wallet } from "ethers";
import { KalypsoSdk } from "kalypso-sdk";
import {
  decrypt,
  getPubKey,
  MARKET_ID,
  bigNumberishToBuffer,
} from "./utils.js";
import { readFileSync } from "fs";

export const testKalypsoEncryption = async (skStr) => {
  const data = Buffer.from("foobar");
  const wallet = new Wallet(
    skStr,
    new ethers.JsonRpcProvider(
      "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
    ),
  );

  const kalypsoConfig = JSON.parse(
    readFileSync("kalypso-config.json", "utf-8"),
  );

  const kalypso = new KalypsoSdk(wallet, kalypsoConfig);
  const { acl, encryptedSecret } = await kalypso
    .MarketPlace()
    .createEncryptedRequestData("0xdead", data, MARKET_ID, getPubKey(skStr));

  console.log("encryptedSecret", encryptedSecret);
  const decrypted = decrypt(skStr, acl, encryptedSecret, MARKET_ID);

  console.log(
    `encryptDecryptTest  ${decrypted.compare(data) == 0 ? "OK" : "FAILED"}`,
  );

  const decrypted2 =
    await KalypsoSdk.SecretInputOperations().decryptDataWithECIESandAES(
      encryptedSecret,
      acl,
      bigNumberishToBuffer(BigInt(skStr)),
      bigNumberishToBuffer(MARKET_ID),
    );
  console.log(data);
  console.log(decrypted);
  console.log(decrypted2);
  console.log(decrypted2.compare(decrypted));
};
