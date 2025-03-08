/* eslint-disable @nx/enforce-module-boundaries */
import { mock } from "jest-mock-extended";
import { mockWallet } from "../../../core/src/lib/testUtils";

import type { MockWalletDependencies } from "../../../core/src/lib/testUtils";
import type { InjectedWallet } from "../../../core/src/lib/wallet";
import { setupMyNearWallet } from "./my-near-wallet";
import type { MyNearWalletConnection } from "./my-near-wallet-connection";

const accountId = "amirsaran.testnet";
const publicKey = "GF7tLvSzcxX4EtrMFtGvGTb2yUj2DhL8hWzc97BwUkyC";

const createMyNearWallet = async (deps: MockWalletDependencies = {}) => {
  const walletConnection = mock<MyNearWalletConnection>();

  const { wallet } = await mockWallet<InjectedWallet>(
    setupMyNearWallet(),
    deps
  );

  return {
    walletConnection,
    wallet,
  };
};

afterEach(() => {
  jest.resetModules();
});

describe("signIn", () => {
  it.skip("sign into mynearwallet", async () => {
    const { wallet, walletConnection } = await createMyNearWallet();

    await wallet.signIn({ contractId: "test.testnet" });

    expect(walletConnection.requestSignIn).toHaveBeenCalled();
  });
});

describe("signOut", () => {
  it.skip("sign out of mynearwallet", async () => {
    const { wallet, walletConnection } = await createMyNearWallet();

    await wallet.signIn({ contractId: "test.testnet" });
    await wallet.signOut();

    expect(walletConnection.signOut).toHaveBeenCalled();
  });
});

describe("getAccounts", () => {
  it.skip("returns array of accounts", async () => {
    const { wallet } = await createMyNearWallet();

    await wallet.signIn({ contractId: "test.testnet" });
    const result = await wallet.getAccounts();

    expect(result).toEqual([{ accountId, publicKey }]);
  });
});

describe("signAndSendTransaction", () => {
  it.skip("sign transaction in mynearwallet", async () => {
    const { wallet, walletConnection } = await createMyNearWallet();

    await wallet.signIn({ contractId: "test.testnet" });
    await wallet.signAndSendTransaction({
      signerId: accountId,
      receiverId: "test.testnet",
      actions: [],
    });

    expect(walletConnection.account).toHaveBeenCalled();
  });
});

describe("signAndSendTransactions", () => {
  it.skip("sign transactions in mynearwallet", async () => {
    const { wallet, walletConnection } = await createMyNearWallet();

    const transactions = [
      {
        signerId: accountId,
        receiverId: "test.testnet",
        actions: [],
      },
      {
        signerId: accountId,
        receiverId: "test.testnet",
        actions: [],
      },
    ];

    await wallet.signIn({ contractId: "test.testnet" });
    const result = await wallet.signAndSendTransactions({
      transactions,
    });

    expect(walletConnection.account).toHaveBeenCalled();
    expect(result.length).toEqual(transactions.length);
  });
});
