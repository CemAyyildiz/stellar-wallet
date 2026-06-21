import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

export function generateWallet() {
  const keypair = StellarSdk.Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

export async function fundWithFriendbot(publicKey) {
  const response = await fetch(
    `https://friendbot.stellar.org?addr=${publicKey}`
  );
  if (!response.ok) throw new Error("Friendbot funding failed");
  return await response.json();
}

export async function getBalance(publicKey) {
  const account = await server.loadAccount(publicKey);
  const xlm = account.balances.find((b) => b.asset_type === "native");
  return xlm ? xlm.balance : "0";
}

export async function sendPayment(secretKey, destination, amount, memo = "") {
  const keypair = StellarSdk.Keypair.fromSecret(secretKey);
  const sourceAccount = await server.loadAccount(keypair.publicKey());

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

  const tx = txBuilder.setTimeout(30).build();
  tx.sign(keypair);

  const result = await server.submitTransaction(tx);
  return result;
}

export async function getTransactions(publicKey) {
  const payments = await server
    .payments()
    .forAccount(publicKey)
    .limit(10)
    .order("desc")
    .call();

  return payments.records.filter((p) => p.type === "payment");
}
