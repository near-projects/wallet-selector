import type {
  WalletModuleFactory,
  WalletBehaviourFactory,
  Transaction,
  Network,
  Account,
  InjectedWallet,
} from "@near-wallet-selector/core";
import icon from "./icon";
import { MyNearWalletConnector } from "./mnw-connect";

export interface MyNearWalletParams {
  walletUrl?: string;
  iconUrl?: string;
  deprecated?: boolean;
  successUrl?: string;
  failureUrl?: string;
}

interface MyNearWalletState {
  wallet: MyNearWalletConnector;
}

interface MyNearWalletExtraOptions {
  walletUrl: string;
}

const resolveWalletUrl = (network: Network, walletUrl?: string) => {
  if (walletUrl) {
    return walletUrl;
  }

  switch (network.networkId) {
    case "mainnet":
      return "https://app.mynearwallet.com";
    case "testnet":
      return "https://testnet.mynearwallet.com";
    default:
      throw new Error("Invalid wallet url");
  }
};

const setupWalletState = async (
  params: MyNearWalletExtraOptions,
  network: Network
): Promise<MyNearWalletState> => {
  const wallet = new MyNearWalletConnector(params.walletUrl, network);

  return {
    wallet,
  };
};

const MyNearWallet: WalletBehaviourFactory<
  InjectedWallet,
  { params: MyNearWalletExtraOptions }
> = async ({ metadata, options, store, params, logger }) => {
  const state = await setupWalletState(params, options.network);

  const getAccounts = async (): Promise<Array<Account>> => {
    const accountId = state.wallet.getAccountId();
    const publicKey = state.wallet.getPublicKey();

    return [
      {
        accountId,
        publicKey: publicKey ? publicKey.toString() : "",
      },
    ];
  };

  return {
    async signIn({ contractId, methodNames }) {
      if (!state.wallet.isSignedIn()) {
        await state.wallet.requestSignIn({
          contractId,
          methodNames,
        });
      }

      return getAccounts();
    },

    async signOut() {
      state.wallet.signOut();
    },

    async getAccounts() {
      return getAccounts();
    },

    async verifyOwner() {
      throw new Error(`Method not supported by ${metadata.name}`);
    },

    async signMessage({
      message,
      nonce,
      recipient,
      callbackUrl,
      state: sgnState,
    }) {
      logger.log("sign message", { message });

      return await state.wallet.signMessage({
        message,
        nonce,
        recipient,
        callbackUrl,
        state: sgnState,
      });
    },

    async signAndSendTransaction({ signerId, receiverId, actions }) {
      logger.log("signAndSendTransaction", {
        signerId,
        receiverId,
        actions,
      });

      const { contract } = store.getState();

      if (!state.wallet.isSignedIn() || !contract) {
        throw new Error("Wallet not signed in");
      }

      const signedAccountId = state.wallet.getAccountId();

      if (signerId && signedAccountId !== signerId) {
        throw new Error(
          `Signed in as ${signedAccountId}, cannot sign for ${signerId}`
        );
      }

      return state.wallet.signAndSendTransaction({
        receiverId: receiverId || contract.contractId,
        actions,
      });
    },

    async signAndSendTransactions({ transactions }) {
      logger.log("signAndSendTransactions", { transactions });

      if (!state.wallet.isSignedIn()) {
        throw new Error("Wallet not signed in");
      }

      return state.wallet.signAndSendTransactions(
        transactions as Array<Transaction>
      );
    },

    buildImportAccountsUrl() {
      return `${params.walletUrl}/batch-import`;
    },
  };
};

export function setupMyNearWallet({
  walletUrl,
  iconUrl = icon,
  deprecated = false,
}: MyNearWalletParams = {}): WalletModuleFactory<InjectedWallet> {
  return async (moduleOptions) => {
    return {
      id: "my-near-wallet",
      type: "injected",
      metadata: {
        name: "MyNearWallet",
        description:
          "NEAR wallet to store, buy, send and stake assets for DeFi.",
        iconUrl,
        deprecated,
        available: true,
        downloadUrl: resolveWalletUrl(moduleOptions.options.network, walletUrl),
      },
      init: (options) => {
        return MyNearWallet({
          ...options,
          params: {
            walletUrl: resolveWalletUrl(options.options.network, walletUrl),
          },
        });
      },
    };
  };
}
