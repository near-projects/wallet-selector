import isMobile from "is-mobile";
import {
  Action,
  Transaction,
  FunctionCallAction,
  InjectedWallet,
  WalletModule,
  waitFor,
} from "@near-wallet-selector/core";

import { InjectedSender } from "./injected-sender";

declare global {
  interface Window {
    near: InjectedSender | undefined;
  }
}

export interface SenderParams {
  iconUrl?: string;
}

// TODO: Temporary fix for Sender until the sign in flow is fixed on their end.
export const LOCAL_STORAGE_SIGNED_IN = `sender:signedIn`;

export function setupSender({
  iconUrl,
}: SenderParams = {}): WalletModule<InjectedWallet> {
  return function Sender({
    options,
    network,
    emitter,
    logger,
    storage,
    updateState,
  }) {
    let wallet: InjectedSender;

    const getAccounts = () => {
      const accountId = wallet.getAccountId();

      if (!accountId) {
        return [];
      }

      return [{ accountId }];
    };

    const isInstalled = async () => {
      try {
        return await waitFor(() => !!window.near?.isSender, {});
      } catch (e) {
        logger.log("Sender:isInstalled:error", e);

        return false;
      }
    };

    const isValidActions = (
      actions: Array<Action>
    ): actions is Array<FunctionCallAction> => {
      return actions.every((x) => x.type === "FunctionCall");
    };

    const transformActions = (actions: Array<Action>) => {
      const validActions = isValidActions(actions);

      if (!validActions) {
        throw new Error(
          "Only 'FunctionCall' actions types are supported by Sender"
        );
      }

      return actions.map((x) => x.params);
    };

    const transformTransactions = (transactions: Array<Transaction>) => {
      return transactions.map((transaction) => {
        return {
          receiverId: transaction.receiverId,
          actions: transformActions(transaction.actions),
        };
      });
    };

    return {
      id: "sender",
      type: "injected",
      name: "Sender",
      description: null,
      iconUrl: iconUrl || "./assets/sender-icon.png",
      downloadUrl:
        "https://chrome.google.com/webstore/detail/sender-wallet/epapihdplajcdnnkdeiahlgigofloibg",

      isAvailable() {
        if (!isInstalled()) {
          return false;
        }

        if (isMobile()) {
          return false;
        }

        return true;
      },

      async init() {
        if (!(await isInstalled())) {
          throw new Error("Wallet not installed");
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        wallet = window.near!;

        wallet.on("accountChanged", async (newAccountId) => {
          logger.log("Sender:onAccountChange", newAccountId);

          try {
            await this.signOut();
            await this.signIn();
          } catch (e) {
            logger.log(
              `Failed to change account ${(e as unknown as Error).message}`
            );
          }
        });

        wallet.on("rpcChanged", (response) => {
          if (network.networkId !== response.rpc.networkId) {
            updateState((prevState) => ({
              ...prevState,
              showModal: true,
              showWalletOptions: false,
              showSwitchNetwork: true,
            }));
          }
        });

        wallet.on("signIn", () => {
          storage.setItem(LOCAL_STORAGE_SIGNED_IN, true);
        });

        wallet.on("signOut", () => {
          storage.removeItem(LOCAL_STORAGE_SIGNED_IN);
        });

        const prevState = storage.getItem<boolean>(LOCAL_STORAGE_SIGNED_IN);

        if (!wallet.isSignedIn() && prevState) {
          await wallet.requestSignIn({
            contractId: options.contractId,
            methodNames: options.methodNames,
          });
        }
      },

      async signIn() {
        if (!(await isInstalled())) {
          return updateState((prevState) => ({
            ...prevState,
            showWalletOptions: false,
            showWalletNotInstalled: this.id,
          }));
        }

        if (!wallet) {
          await this.init();
        }

        const { accessKey } = await wallet.requestSignIn({
          contractId: options.contractId,
          methodNames: options.methodNames,
        });

        if (!accessKey) {
          throw new Error("Failed to sign in");
        }

        updateState((prevState) => ({
          ...prevState,
          showModal: false,
          selectedWalletId: this.id,
        }));

        const accounts = getAccounts();
        emitter.emit("signIn", { accounts });
        emitter.emit("accountsChanged", { accounts });
      },

      async isSignedIn() {
        return wallet.isSignedIn();
      },

      async signOut() {
        const res = wallet.signOut();

        if (!res) {
          throw new Error("Failed to sign out");
        }

        updateState((prevState) => ({
          ...prevState,
          selectedWalletId: null,
        }));

        const accounts = getAccounts();
        emitter.emit("accountsChanged", { accounts });
        emitter.emit("signOut", { accounts });
      },

      async getAccounts() {
        return getAccounts();
      },

      async signAndSendTransaction({ signerId, receiverId, actions }) {
        logger.log("Sender:signAndSendTransaction", {
          signerId,
          receiverId,
          actions,
        });

        return wallet
          .signAndSendTransaction({
            receiverId,
            actions: transformActions(actions),
          })
          .then((res) => {
            if (res.error) {
              throw new Error(res.error);
            }

            // Shouldn't happen but avoids inconsistent responses.
            if (!res.response?.length) {
              throw new Error("Invalid response");
            }

            return res.response[0];
          });
      },

      async signAndSendTransactions({ transactions }) {
        logger.log("Sender:signAndSendTransactions", { transactions });

        return wallet
          .requestSignTransactions({
            transactions: transformTransactions(transactions),
          })
          .then((res) => {
            if (res.error) {
              throw new Error(res.error);
            }

            // Shouldn't happen but avoids inconsistent responses.
            if (!res.response?.length) {
              throw new Error("Invalid response");
            }

            return res.response;
          });
      },
    };
  };
}
