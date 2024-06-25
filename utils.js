import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { ethers } from "ethers";
import {
  encrypt as encryptECIES,
  decrypt as decryptECIES,
  PrivateKey,
} from "eciesjs";

export function getPubKey(skStr) {
  const eciesSK = new PrivateKey(bigNumberishToBuffer(BigInt(skStr)));
  return "0x" + eciesSK.publicKey.toHex(false);
}
export function bigNumberishToBuffer(value) {
  const uintArray = ethers.toBeArray(value);
  return Buffer.from(uintArray);
}
export const encrypt = (data, pubKey, associatedData) => {
  const encryptAesGcm = (data, secretKey, associatedData) => {
    const iv = randomBytes(12); // 12 bytes for GCM
    const cipher = createCipheriv("aes-256-gcm", secretKey, iv);

    if (associatedData) {
      cipher.setAAD(associatedData);
    }
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag(); // Get the authentication tag

    return Buffer.concat([iv, encrypted, authTag]);
  };

  const cipher = randomBytes(32);
  // Encrypt the data using the secret key
  const encryptedData = encryptAesGcm(
    data,
    cipher,
    bigNumberishToBuffer(associatedData),
  );
  // Encrypt the secret key using ECIES
  const acl = encryptECIES(pubKey, cipher);

  console.log({
    encrypted_secret: encryptedData.length,
    acl: acl.length,
  });
  console.log(encryptedData);
  return {
    acl,
    encryptedData,
  };
};
export const MARKET_ID = BigInt(3);
export const decrypt = (sk, acl, encryptedData, associatedData) => {
  const decryptAesGcm = (encryptedData, secretKey, associatedData) => {
    const ivLength = 12; // 12 bytes for GCM
    const authTagLength = 16; // 16 bytes for GCM

    if (encryptedData.length <= ivLength + authTagLength) {
      throw new Error("Invalid encrypted data format.");
    }

    const iv = encryptedData.slice(0, ivLength);
    const authTag = encryptedData.slice(encryptedData.length - authTagLength);
    const encryptedText = encryptedData.slice(
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
  const decryptedSecretKey = decryptECIES(sk.split("x")[1], acl);

  return decryptAesGcm(
    encryptedData,
    decryptedSecretKey,
    bigNumberishToBuffer(associatedData),
  );
};
