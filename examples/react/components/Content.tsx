import React, { Fragment, useCallback, useEffect, useState } from "react";
import { utils } from "near-api-js";
import type {
  SignedMessage,
  SignMessageParams,
  Transaction,
} from "@near-wallet-selector/core";
import { verifyFullKeyBelongsToUser } from "@near-wallet-selector/core";
import { verifySignature } from "@near-wallet-selector/core";

import type { Message } from "../interfaces";
import { CONTRACT_ID } from "../constants";
import SignIn from "./SignIn";
import Form from "./Form";
import Messages from "./Messages";
import { useWalletSelector } from "@near-wallet-selector/react-hook";

type Submitted = SubmitEvent & {
  target: { elements: { [key: string]: HTMLInputElement } };
};

const SUGGESTED_DONATION = "0";
const BOATLOAD_OF_GAS = "30000000000000";

const Content: React.FC = () => {
  const {
    accounts,
    signedAccountId,
    signOut,
    signIn,
    viewFunction,
    callFunction,
    signAndSendTransactions,
    wallet,
    signMessage,
    walletSelector,
  } = useWalletSelector();

  const [messages, setMessages] = useState<Array<Message>>([]);

  const getMessages = useCallback(async () => {
    const messages = await viewFunction({
      contractId: CONTRACT_ID,
      method: "getMessages",
    }) as Array<Message>;

    return messages.reverse();
  }, [viewFunction]);

  useEffect(() => {
    getMessages().then(setMessages);
  }, []);

  const handleSwitchAccount = () => {
    if (!accounts) {
      throw new Error("No accounts found");
    }

    if (!walletSelector) {
      throw new Error("No selector found");
    }
    const currentIndex = accounts.findIndex(
      (x) => x.accountId === signedAccountId
    );
    const nextIndex = currentIndex < accounts.length - 1 ? currentIndex + 1 : 0;

    const nextAccountId = accounts[nextIndex].accountId;

    walletSelector.then((selector) => {
      selector.setActiveAccount(nextAccountId);
    });

    alert("Switched account to " + nextAccountId);
  };

  const addMessages = useCallback(
    async (message: string, donation: string, multiple: boolean) => {
      if (!multiple) {
        return callFunction({
          contractId: CONTRACT_ID,
          method: "addMessage",
          args: { text: message },
          deposit: utils.format.parseNearAmount(donation)!,
        }).catch((err) => {
          alert("Failed to add message " + err);
          console.log("Failed to add message");

          throw err;
        });
      }

      const transactions: Array<Transaction> = [];

      for (let i = 0; i < 2; i += 1) {
        transactions.push({
          signerId: signedAccountId!,
          receiverId: CONTRACT_ID,
          actions: [
            {
              type: "FunctionCall",
              params: {
                methodName: "addMessage",
                args: {
                  text: `${message} (${i + 1}/2)`,
                },
                gas: BOATLOAD_OF_GAS,
                deposit: utils.format.parseNearAmount(donation)!,
              },
            },
          ],
        });
      }

      return signAndSendTransactions({ transactions }).catch((err) => {
        alert("Failed to add messages exception " + err);
        console.log("Failed to add messages");

        throw err;
      });
    },
    [signedAccountId, callFunction, signAndSendTransactions]
  );

  const verifyMessage = async (
    message: SignMessageParams,
    signedMessage: SignedMessage
  ) => {
    const verifiedSignature = verifySignature({
      message: message.message,
      nonce: message.nonce,
      recipient: message.recipient,
      publicKey: signedMessage.publicKey,
      signature: signedMessage.signature,
      callbackUrl: message.callbackUrl,
    });

    const selector = await walletSelector;
    if (!selector) {
      throw new Error("No selector found");
    }
    const verifiedFullKeyBelongsToUser = await verifyFullKeyBelongsToUser({
      publicKey: signedMessage.publicKey,
      accountId: signedMessage.accountId,
      network: selector.options.network,
    });

    const isMessageVerified = verifiedFullKeyBelongsToUser && verifiedSignature;

    const alertMessage = isMessageVerified
      ? "Successfully verified"
      : "Failed to verify";

    alert(
      `${alertMessage} signed message: '${message.message
      }': \n ${JSON.stringify(signedMessage)}`
    );
  };

  const handleSubmit = useCallback(
    async (e: Submitted) => {
      e.preventDefault();

      const { fieldset, message, donation, multiple } = e.target.elements;

      fieldset.disabled = true;

      return addMessages(message.value, donation.value || "0", multiple.checked)
        .then(() => {
          return getMessages()
            .then((nextMessages) => {
              setMessages(nextMessages);
              message.value = "";
              donation.value = SUGGESTED_DONATION;
              fieldset.disabled = false;
              multiple.checked = false;
              message.focus();
            })
            .catch((err) => {
              alert("Failed to refresh messages");
              console.log("Failed to refresh messages");

              throw err;
            });
        })
        .catch((err) => {
          console.error(err);

          fieldset.disabled = false;
        });
    },
    [addMessages, getMessages]
  );

  const handleSignMessage = async () => {
    if (!wallet) {
      throw new Error("No wallet connected");
    }

    const message = "test message to sign";
    const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(32)));
    const recipient = "guest-book.testnet";

    try {
      const signedMessage = await signMessage({
        message,
        nonce,
        recipient,
      });
      if (signedMessage) {
        await verifyMessage({ message, nonce, recipient }, signedMessage);
      }
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : "Something went wrong";
      alert(errMsg);
    }
  };

  if (!signedAccountId) {
    return (
      <Fragment>
        <div>
          <button onClick={signIn}>Log in</button>
        </div>
        <SignIn />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <div>
        <button onClick={signIn}>Switch Wallet</button>
        <button onClick={handleSignMessage}>Sign Message</button>
        {accounts && accounts.length > 1 && (
          <button onClick={handleSwitchAccount}>Switch Account</button>
        )}
        <button onClick={signOut}>Log out {signedAccountId}</button>
      </div>
      <Form
        signedAccountId={signedAccountId}
        onSubmit={(e) => handleSubmit(e as unknown as Submitted)}
      />
      <Messages messages={messages} />
    </Fragment>
  );
};

export default Content;
