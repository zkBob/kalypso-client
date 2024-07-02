import { ethers, Wallet } from "ethers";
import express from "express";
import { json } from "express";
import cors from "cors";
import { KalypsoSdk } from "kalypso-sdk";
import { config } from "dotenv";
import { inflate } from "pako";
import BigNumber from "bignumber.js";
import {
  decrypt,
  getPubKey,
  initKalypso,
  initWallet,
  MARKET_ID,
  printBalance,
  PROVIDER,
  unmarshal,
} from "./utils";
import axios from "axios";
import { readFileSync } from "fs";
config();
const app = express();
app.use(cors());
app.use(express.json());
const sk: string = process.env.SK!;
const wallet = initWallet(sk);
const kalypso = initKalypso(wallet);
app.post("/decrypt", (req, res) => {
  const { acl, encryptedSecret } = req.body;
  try {
    const decrypted = decrypt(
      sk,
      unmarshal(acl),
      unmarshal(encryptedSecret),
      MARKET_ID,
    );
    console.log("decrypted", inflate(decrypted));
    console.log(
      JSON.parse(new TextDecoder("utf-8").decode(inflate(decrypted))),
    );
    res.status(200).send("decrypted successfully");
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e.toString());
  }
});

interface Proof {
  a: string[];
  b: string[][];
  c: string[];
}

app.post("/proveTx", async (req, res) => {
  const reward = "1000000000000000123";

  const latestBlock = await PROVIDER.getBlockNumber();

  const body = req.body;

  console.log("received proving request acl length: ", body.acl.data.length);

  const assignmentDeadline = new BigNumber(latestBlock).plus(10000000000);
  console.log({
    latestBlock,
    assignmentDeadline: assignmentDeadline.toFixed(0),
  });
  const proofGenerationTimeInBlocks = new BigNumber(10000000000);

  // Create ASK request
  try {
    const encryptedSecret = unmarshal(body.encryptedSecret);
    const acl = unmarshal(body.acl);
    const askRequest = await kalypso
      .MarketPlace()
      .createAskWithEncryptedSecretAndAcl(
        MARKET_ID,
        unmarshal(body.publicInputs),
        reward,
        assignmentDeadline.toFixed(0),
        proofGenerationTimeInBlocks.toFixed(0),
        await wallet.getAddress(),
        0, // TODO: keep this 0 for now
        encryptedSecret,
        acl,
      );
    await askRequest.wait();
    console.log("Ask Request Hash: ", askRequest.hash);

    let receipt = await PROVIDER.getTransactionReceipt(askRequest.hash);

    if (!receipt) {
      throw new Error("failed to get tx receipt");
    }
    let blockNumber = receipt.blockNumber;

    let askId = await kalypso.MarketPlace().getAskId(receipt);
    console.log(`Ask ID : ${askId} minted in block ${blockNumber}`);

    const proof: Proof = await getProofByAskId(askId, blockNumber);

    // return JSON.stringify(proof);
    res.send(JSON.stringify(proof));
  } catch (e: any) {
    console.log("exception :", e);
    res.status(500).send({ error: e.toString() });
  }
});

app.get("/config", (req, res) => {
  const kalypsoConfig = JSON.parse(readFileSync(process.env.CONFIG!, "utf-8"));
  res.send({ ref: "0.1.0", commitHash: "0abcd", ...kalypsoConfig });
});
app.listen(8092, () => {
  console.log("using pubkey", getPubKey(sk));
  printBalance(wallet);
  sendTestRequest();
});

const sendTestRequest = () => {
  setTimeout(async () => {
    const encryptedRequest = await kalypso
      .MarketPlace()
      .createEncryptedRequestData(
        "0xdead",
        Buffer.from(JSON.stringify({ foo: "bar" })),
        MARKET_ID,
        getPubKey(sk),
      );

    try {
      const res = await axios.post(
        "http://localhost:8092/decrypt",
        JSON.stringify(encryptedRequest),
        {
          headers: {
            "Content-type": "application/json",
          },
        },
      );
    } catch (e: any) {
      console.error("axios threw error ", e.response.data);
    }
  }, 1000);
};

const getProofByAskId = async (
  askId: string,
  blockNumber: number,
): Promise<Proof> => {
  return new Promise((resolve) => {
    const start = Date.now();
    console.log("\nTrying to fetch proof...\n");
    let intervalId = setInterval(async () => {
      let data = await kalypso
        .MarketPlace()
        .getProofByAskId(askId, blockNumber!);
      if (data?.proof_generated) {
        console.log(data.message);
        console.log(`proof generation took ${(Date.now() - start) / 1000} s`);
        let abiCoder = new ethers.AbiCoder();
        let proof = abiCoder.decode(["uint256[8]"], data.proof);

        let formated_proof = {
          a: [proof[0][0].toString(), proof[0][1].toString()],
          b: [
            [proof[0][2].toString(), proof[0][3].toString()],
            [proof[0][4].toString(), proof[0][5].toString()],
          ],
          c: [proof[0][6].toString(), proof[0][7].toString()],
        };
        resolve(formated_proof);
        clearInterval(intervalId);
      } else {
        console.log(`Proof not submitted yet for askId : ${askId}.`);
      }
    }, 10000);
  });
};
