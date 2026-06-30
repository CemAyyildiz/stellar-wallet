import {
  isConnected,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

export async function checkFreighterInstalled() {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectFreighterWallet() {
  const installed = await isConnected();
  if (!installed.isConnected) {
    throw new Error(
      "Freighter extension is not installed. Install it from freighter.app and refresh."
    );
  }

  const permission = await setAllowed();
  if (!permission.isAllowed) {
    throw new Error("Connection denied. Allow this app in Freighter to continue.");
  }

  const addressResult = await getAddress();
  if (addressResult.error || !addressResult.address) {
    throw new Error(
      addressResult.error?.message || "Could not retrieve wallet address from Freighter."
    );
  }

  return addressResult.address;
}

export async function sendPaymentWithFreighter(
  publicKey,
  destination,
  amount,
  memo = ""
) {
  const sourceAccount = await server.loadAccount(publicKey);

  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: StellarSdk.Networks.TESTNET,
  }).addOperation(
    StellarSdk.Operation.payment({
      destination,
      asset: StellarSdk.Asset.native(),
      amount: amount.toString(),
    })
  );

  if (memo) {
    txBuilder.addMemo(StellarSdk.Memo.text(memo));
  }

  const transaction = txBuilder.setTimeout(30).build();
  const unsignedXdr = transaction.toXDR();

  const signResult = await signTransaction(unsignedXdr, {
    networkPassphrase: StellarSdk.Networks.TESTNET,
    address: publicKey,
  });

  if (signResult.error || !signResult.signedTxXdr) {
    throw new Error(signResult.error?.message || "Transaction signing was rejected.");
  }

  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    StellarSdk.Networks.TESTNET
  );

  return server.submitTransaction(signedTx);
}
