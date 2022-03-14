import isMobile from "is-mobile";

import InjectedSenderWallet from "./InjectedSenderWallet";
import { Action, FunctionCallAction } from "../actions";
import { senderWalletIcon } from "../icons";
import { InjectedWallet, WalletModule } from "../Wallet";

declare global {
  interface Window {
    near: InjectedSenderWallet | undefined;
  }
}

function setupSenderWallet(): WalletModule<InjectedWallet> {
  return function SenderWallet({
    options,
    provider,
    emitter,
    logger,
    updateState,
  }) {
    let wallet: InjectedSenderWallet;

    const isInstalled = () => {
      return !!window.near?.isSender;
    };

    const timeout = (ms: number) => {
      return new Promise((resolve) => setTimeout(resolve, ms));
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
          "Only 'FunctionCall' actions types are supported by Sender Wallet"
        );
      }

      return actions.map((x) => x.params);
    };

    return {
      id: "sender-wallet",
      type: "injected",
      name: "Sender Wallet",
      description: null,
      iconUrl: senderWalletIcon,

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
        await timeout(200);

        if (!isInstalled()) {
          throw new Error("Wallet not installed");
        }

        wallet = window.near!;

        wallet.on("accountChanged", async (newAccountId) => {
          logger.log("SenderWallet:onAccountChange", newAccountId);

          try {
            await this.signOut();
            await this.signIn();
          } catch (e) {
            logger.log(`Failed to change account ${e.message}`);
          }
        });

        wallet.on("rpcChanged", (response) => {
          if (options.networkId !== response.rpc.networkId) {
            updateState((prevState) => ({
              ...prevState,
              showModal: true,
              showWalletOptions: false,
              showSwitchNetwork: true,
            }));
          }
        });
      },

      async signIn() {
        if (!isInstalled()) {
          return updateState((prevState) => ({
            ...prevState,
            showWalletOptions: false,
            showSenderWalletNotInstalled: true,
          }));
        }

        if (!wallet) {
          await this.init();
        }

        const { accessKey } = await wallet.requestSignIn({
          contractId: options.contract.contractId,
          methodNames: options.contract.methodNames,
        });

        if (!accessKey) {
          throw new Error("Failed to sign in");
        }

        updateState((prevState) => ({
          ...prevState,
          showModal: false,
          selectedWalletId: this.id,
        }));
        emitter.emit("signIn");
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
        emitter.emit("signOut");
      },

      async getAccount() {
        const signedIn = await this.isSignedIn();

        if (!signedIn) {
          return null;
        }

        const accountId = wallet.getAccountId();
        const account = await provider.viewAccount({ accountId });

        return {
          accountId,
          balance: account.amount,
        };
      },

      async signAndSendTransaction({ receiverId, actions }) {
        logger.log("SenderWallet:signAndSendTransaction", {
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
    };
  };
}

export default setupSenderWallet;
