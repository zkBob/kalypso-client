import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { BigNumberish, ethers, JsonRpcProvider, Wallet } from "ethers";
import {
  encrypt as encryptECIES,
  decrypt as decryptECIES,
  PrivateKey,
} from "eciesjs";
import { KalypsoSdk } from "kalypso-sdk";
import { KalspsoConfig } from "kalypso-sdk/dist/types";
import { readFileSync } from "fs";

export function getPubKey(sk: string) {
  const eciesSK = new PrivateKey(bigNumberishToBuffer(BigInt(sk)));
  return "0x" + eciesSK.publicKey.toHex(false);
}
export function bigNumberishToBuffer(value: BigNumberish) {
  const uintArray = ethers.toBeArray(value);
  return Buffer.from(uintArray);
}
const encryptAesGcm = (
  data: Buffer,
  secretKey: Buffer,
  associatedData: Buffer,
) => {
  const iv = randomBytes(12); // 12 bytes for GCM
  const cipher = createCipheriv("aes-256-gcm", secretKey, iv);

  if (associatedData) {
    cipher.setAAD(associatedData);
  }
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag(); // Get the authentication tag

  return Buffer.concat([iv, encrypted, authTag]);
};
export const encrypt = (
  data: Buffer,
  pubKey: string,
  associatedData: BigNumberish,
) => {
  const cipher = randomBytes(32);
  // Encrypt the data using the secret key
  const encryptedSecret = encryptAesGcm(
    data,
    cipher,
    bigNumberishToBuffer(associatedData),
  );
  // Encrypt the secret key using ECIES
  const acl = encryptECIES(pubKey, cipher);

  console.log({
    encrypted_secret: encryptedSecret.length,
    acl: acl.length,
  });
  console.log(encryptedSecret);
  return {
    acl,
    encryptedSecret,
  };
};
export const MARKET_ID = BigInt(3);
export const decrypt = (
  sk: string,
  acl: Buffer,
  encryptedData: Buffer,
  associatedData: BigNumberish,
) => {
  const decryptedSecretKey = decryptECIES(sk.split("x")[1], acl);

  return decryptAesGcm(
    encryptedData,
    decryptedSecretKey,
    bigNumberishToBuffer(associatedData),
  );
};

const decryptAesGcm = (
  encryptedData: Buffer,
  secretKey: Buffer,
  associatedData: Buffer,
) => {
  const ivLength = 12; // 12 bytes for GCM
  const authTagLength = 16; // 16 bytes for GCM

  if (encryptedData.length <= ivLength + authTagLength) {
    throw new Error("Invalid encrypted data format.");
  }

  const iv = encryptedData.subarray(0, ivLength);
  const authTag = encryptedData.subarray(encryptedData.length - authTagLength);
  const encryptedText = encryptedData.subarray(
    ivLength,
    encryptedData.length - authTagLength,
  );

  const decipher = createDecipheriv("aes-256-gcm", secretKey, iv);
  decipher.setAuthTag(authTag);

  // Set the associated data if it was used during encryption
  if (associatedData) {
    decipher.setAAD(associatedData);
  }

  try {
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  } catch (err) {
    throw new Error("Decryption failed - possibly tampered data.");
  }
};
const RPC = "https://arbitrum-sepolia.blockpi.network/v1/rpc/public";
export const PROVIDER = new ethers.JsonRpcProvider(RPC);
export const initWallet = (sk: string): Wallet => {
  return new ethers.Wallet(sk, PROVIDER);
};

export const initKalypso = (wallet: Wallet): KalypsoSdk => {
  const kalypsoConfig: KalspsoConfig = JSON.parse(
    readFileSync("kalypso-config.json", "utf-8"),
  );
  return new KalypsoSdk(wallet, kalypsoConfig);
};

export const printBalance = async (wallet: Wallet) => {
  const walletBalanceString = (
    await PROVIDER.getBalance(await wallet.getAddress())
  ).toString();
  const decimals = 18;

  const balanceStringWithDecimalPoint =
    walletBalanceString.length < 18
      ? ["0.", walletBalanceString.padStart(decimals, "0")].join("")
      : [
          walletBalanceString.slice(0, walletBalanceString.length - decimals),
          ".",
          walletBalanceString.slice(walletBalanceString.length - decimals),
        ].join("");
  console.log(
    `current balance is  ${Number.parseFloat(balanceStringWithDecimalPoint)}`,
  );
};

export const unmarshal = (obj: { data: Uint8Array }): Buffer => {
  return Buffer.from(obj.data);
};
