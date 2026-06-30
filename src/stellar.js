import * as StellarSdk from "@stellar/stellar-sdk";

const server = new StellarSdk.Horizon.Server(
  "https://horizon-testnet.stellar.org"
);

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

export async function getTransactions(publicKey) {
  const payments = await server
    .payments()
    .forAccount(publicKey)
    .limit(10)
    .order("desc")
    .call();

  return payments.records.filter((p) => p.type === "payment");
}
