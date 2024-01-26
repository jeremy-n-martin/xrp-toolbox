/* eslint-disable max-depth --  needed for attestation checking */
/* eslint-disable @typescript-eslint/consistent-type-assertions -- needed here */
/* eslint-disable no-await-in-loop -- needed here */
const xrpl = require("xrpl");

async function sleep(sec) {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

const lockingClient = new xrpl.Client("wss://s.devnet.rippletest.net:51233");
const issuingClient = new xrpl.Client(
  "wss://sidechain-net2.devnet.rippletest.net:51233"
);
const MAX_LEDGERS_WAITED = 5;
const LEDGER_CLOSE_TIME = 4;

void bridgeTransfer();

async function bridgeTransfer() {
  await lockingClient.connect();
  await issuingClient.connect();
  const lockingChainDoor = "rnQAXXWoFNN6PEqwqsdTngCtFPCrmfuqFJ";

  const accountObjectsRequest = {
    command: "account_objects",
    account: lockingChainDoor,
    type: "bridge",
  };
  const lockingAccountObjects = (
    await lockingClient.request(accountObjectsRequest)
  ).result.account_objects;
  // There will only be one here - a door account can only have one bridge per currency
  const bridgeData = lockingAccountObjects.filter(
    (obj) =>
      obj.LedgerEntryType === "Bridge" &&
      obj.XChainBridge.LockingChainIssue.currency === "XRP"
  )[0];
  const bridge = bridgeData.XChainBridge;
  console.log(bridge);

  console.log("Creating wallet on the locking chain via the faucet...");
  const { wallet: wallet1 } = await lockingClient.fundWallet();
  console.log(wallet1);
  const wallet2 = xrpl.Wallet.generate();

  console.log(
    `Creating ${wallet2.classicAddress} on the issuing chain via the bridge...`
  );

  const fundTx = {
    TransactionType: "XChainAccountCreateCommit",
    Account: wallet1.classicAddress,
    XChainBridge: bridge,
    SignatureReward: bridgeData.SignatureReward,
    Destination: wallet2.classicAddress,
    Amount: (parseInt(bridgeData.MinAccountCreateAmount, 10) * 2).toString(),
  };
  const fundResponse = await lockingClient.submitAndWait(fundTx, {
    wallet: wallet1,
  });
  console.log(fundResponse);

  console.log(
    "Waiting for the attestation to go through... (usually 8-12 seconds)"
  );
  let ledgersWaited = 0;
  let initialBalance = "0";
  while (ledgersWaited < MAX_LEDGERS_WAITED) {
    await sleep(LEDGER_CLOSE_TIME);
    try {
      initialBalance = await issuingClient.getXrpBalance(
        wallet2.classicAddress
      );
      console.log(
        `Wallet ${wallet2.classicAddress} has been funded with a balance of ${initialBalance} XRP`
      );
      break;
    } catch (_error) {
      ledgersWaited += 1;
      if (ledgersWaited === MAX_LEDGERS_WAITED) {
        // This error should never be hit if the bridge is running
        throw Error("Destination account creation via the bridge failed.");
      }
    }
  }

  console.log(
    `Transferring funds from ${wallet1.classicAddress} on the locking chain to ` +
      `${wallet2.classicAddress} on the issuing_chain...`
  );

  // Fetch the claim ID for the transfer
  console.log("Step 1: Fetching the claim ID for the transfer...");
  const claimIdTx = {
    TransactionType: "XChainCreateClaimID",
    Account: wallet2.classicAddress,
    XChainBridge: bridge,
    SignatureReward: bridgeData.SignatureReward,
    OtherChainSource: wallet1.classicAddress,
  };
  const claimIdResult = await issuingClient.submitAndWait(claimIdTx, {
    wallet: wallet2,
  });
  console.log(claimIdResult);

  // Extract new claim ID from metadata
  const xchainClaimId = xrpl.getXChainClaimID(claimIdResult.result.meta);
  if (xchainClaimId == null) {
    // This shouldn't trigger assuming the transaction succeeded
    throw Error("Could not extract XChainClaimID");
  }

  console.log(`Claim ID for the transfer: ${xchainClaimId}`);

  console.log(
    "Step 2: Locking the funds on the locking chain with an XChainCommit transaction..."
  );
  const commitTx = {
    TransactionType: "XChainCommit",
    Account: wallet1.classicAddress,
    Amount: xrpl.xrpToDrops(1),
    XChainBridge: bridge,
    XChainClaimID: xchainClaimId,
    OtherChainDestination: wallet2.classicAddress,
  };
  const commitResult = await lockingClient.submitAndWait(commitTx, {
    wallet: wallet1,
  });
  console.log(commitResult);

  console.log(
    "Waiting for the attestation to go through... (usually 8-12 seconds)"
  );
  ledgersWaited = 0;
  while (ledgersWaited < MAX_LEDGERS_WAITED) {
    await sleep(LEDGER_CLOSE_TIME);
    const currentBalance = await issuingClient.getXrpBalance(
      wallet2.classicAddress
    );
    console.log(initialBalance, currentBalance);
    if (parseFloat(currentBalance) > parseFloat(initialBalance)) {
      console.log("Transfer is complete");
      console.log(
        `New balance of ${wallet2.classicAddress} is ${currentBalance} XRP`
      );
      break;
    }

    ledgersWaited += 1;
    if (ledgersWaited === MAX_LEDGERS_WAITED) {
      throw Error("Bridge transfer failed.");
    }
  }

  await lockingClient.disconnect();
  await issuingClient.disconnect();
}