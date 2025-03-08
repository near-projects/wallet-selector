import type {
  Action,
  FinalExecutionOutcome,
  Network,
  SignedMessage,
  SignMessageParams,
  Transaction,
} from "@near-wallet-selector/core";
import { createAction } from "@near-wallet-selector/wallet-utils";
import { connect, keyStores, providers, transactions } from "near-api-js";
import type { KeyPairString, PublicKey } from "near-api-js/lib/utils";
import { KeyPair, serialize } from "near-api-js/lib/utils";
import * as borsh from "borsh";
import { SCHEMA } from "near-api-js/lib/transaction";
import type { JsonRpcProvider } from "near-api-js/lib/providers";

const DEFAULT_POPUP_WIDTH = 480;
const DEFAULT_POPUP_HEIGHT = 640;
const POLL_INTERVAL = 300;

interface WalletMessage {
  status: "success" | "failure" | "pending";
  transactionHashes?: string;
  error?: string;
  [key: string]: unknown;
  signedRequest?: SignedMessage;
  errorMessage?: string;
  errorCode?: string;
}

interface FunctionCallKey {
  privateKey: KeyPairString;
  contractId: string;
  methods: Array<string>;
}

interface WalletResponseData extends WalletMessage {
  public_key?: string;
  account_id: string;
}

export class MyNearWalletConnector {
  walletUrl: string;
  signedAccountId: string;
  functionCallKey: FunctionCallKey | null;
  provider: JsonRpcProvider;
  network: Network;

  constructor(walletUrl: string, network: Network) {
    this.walletUrl = walletUrl;
    this.provider = new providers.JsonRpcProvider({ url: network.nodeUrl });
    this.signedAccountId = localStorage.getItem("signedAccountId") || "";
    const functionCallKey = localStorage.getItem("functionCallKey");
    this.functionCallKey = functionCallKey ? JSON.parse(functionCallKey) : null;

    this.network = network;
  }

  getAccountId(): string {
    return this.signedAccountId;
  }
  getPublicKey(): PublicKey | undefined {
    if (this.functionCallKey) {
      return KeyPair.fromString(this.functionCallKey.privateKey).getPublicKey();
    }
    return undefined;
  }

  isSignedIn(): boolean {
    return !!this.signedAccountId;
  }

  signOut(): void {
    this.signedAccountId = "";
    this.functionCallKey = null;
    localStorage.removeItem("signedAccountId");
    localStorage.removeItem("functionCallKey");
  }

  async requestSignIn({
    contractId,
    methodNames,
  }: {
    contractId: string;
    methodNames?: Array<string>;
  }): Promise<Array<{ accountId: string; publicKey: string }>> {
    const url = await this.requestSignInUrl({ contractId, methodNames });

    return await this.handlePopupTransaction(url, async (data) => {
      const responseData = data as WalletResponseData;

      const { public_key: publicKey, account_id: accountId } = responseData;

      if (accountId) {
        this.signedAccountId = accountId;
        localStorage.setItem("signedAccountId", accountId);
        return [{ accountId, publicKey: publicKey || "" }];
      }
      throw new Error("Invalid response data from wallet");
    });
  }

  async requestSignInUrl({
    contractId,
    methodNames,
  }: {
    contractId: string;
    methodNames?: Array<string>;
  }): Promise<string> {
    const currentUrl = new URL(window.location.href);

    const newUrl = new URL(`${this.walletUrl}/login/`);
    newUrl.searchParams.set("success_url", currentUrl.href);
    newUrl.searchParams.set("failure_url", currentUrl.href);

    if (contractId) {
      newUrl.searchParams.set("contract_id", contractId);

      const accessKey = KeyPair.fromRandom("ed25519");
      newUrl.searchParams.set(
        "public_key",
        accessKey.getPublicKey().toString()
      );

      this.functionCallKey = {
        privateKey: accessKey.toString(),
        contractId,
        methods: methodNames || [],
      };

      localStorage.setItem(
        "functionCallKey",
        JSON.stringify(this.functionCallKey)
      );
    }

    if (methodNames) {
      methodNames.forEach((methodName) => {
        newUrl.searchParams.append("methodNames", methodName);
      });
    }

    return newUrl.toString();
  }

  async signMessage({
    message,
    nonce,
    recipient,
    callbackUrl,
    state,
  }: SignMessageParams) {
    const url = callbackUrl || window.location.href;

    if (!url) {
      throw new Error(`MyNearWallet: CallbackUrl is missing`);
    }

    const href = new URL(this.walletUrl);
    href.pathname = "sign-message";
    href.searchParams.append("message", message);
    href.searchParams.append("nonce", nonce.toString("base64"));
    href.searchParams.append("recipient", recipient);
    href.searchParams.append("callbackUrl", url);
    if (state) {
      href.searchParams.append("state", state);
    }

    return await this.handlePopupTransaction(href.toString(), (value) => {
      return {
        accountId: value?.signedRequest?.accountId || "",
        publicKey: value?.signedRequest?.publicKey || "",
        signature: value?.signedRequest?.signature || "",
      };
    });
  }

  async signAndSendTransactions(
    transactionsWS: Array<Transaction>
  ): Promise<Array<FinalExecutionOutcome>> {
    const txs = await Promise.all(
      transactionsWS.map((t) => this.completeTransaction(t))
    );
    return this.signAndSendTransactionsMNW(txs);
  }

  async signAndSendTransaction({
    receiverId,
    actions,
  }: {
    receiverId: string;
    actions: Array<Action>;
  }): Promise<FinalExecutionOutcome> {
    if (actions.length === 1 && this.storedKeyCanSign(receiverId, actions)) {
      try {
        return this.signUsingKeyPair({ receiverId, actions });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          "Failed to sign using key pair, falling back to wallet",
          error
        );
      }
    }
    const tx = await this.completeTransaction({ receiverId, actions });
    const results = await this.signAndSendTransactionsMNW([tx]);
    return results[0];
  }

  async completeTransaction({
    receiverId,
    actions,
  }: {
    receiverId: string;
    actions: Array<Action>;
  }): Promise<transactions.Transaction> {
    // To create a transaction we need a recent block
    const block = await this.provider.block({ finality: "final" });
    const blockHash = serialize.base_decode(block.header.hash);

    // create Transaction for the wallet
    return transactions.createTransaction(
      this.signedAccountId,
      KeyPair.fromRandom("ed25519").getPublicKey(),
      receiverId,
      0,
      actions.map((a) => createAction(a)),
      blockHash
    );
  }

  async signAndSendTransactionsMNW(
    txs: Array<transactions.Transaction>
  ): Promise<Array<FinalExecutionOutcome>> {
    const url = this.requestSignTransactionsUrl(txs);
    const txsHashes = (
      await this.handlePopupTransaction(url, (data) => data.transactionHashes)
    )?.split(",");

    if (!txsHashes) {
      throw new Error("No transaction hashes received");
    }

    return Promise.all(
      txsHashes.map((hash) => this.provider.txStatus(hash, "unused", "NONE"))
    );
  }

  storedKeyCanSign(receiverId: string, actions: Array<Action>) {
    if (
      this.functionCallKey &&
      this.functionCallKey.contractId === receiverId
    ) {
      return (
        actions[0].type === "FunctionCall" &&
        actions[0].params.deposit === "0" &&
        (this.functionCallKey.methods.length === 0 ||
          this.functionCallKey.methods.includes(actions[0].params.methodName))
      );
    } else {
      return false;
    }
  }

  async signUsingKeyPair({
    receiverId,
    actions,
  }: {
    receiverId: string;
    actions: Array<Action>;
  }): Promise<FinalExecutionOutcome> {
    // instantiate an account (NEAR API is a nightmare)
    const myKeyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(this.functionCallKey!.privateKey);
    await myKeyStore.setKey(
      this.network.networkId,
      this.signedAccountId,
      keyPair
    );

    const near = await connect({ ...this.network, keyStore: myKeyStore });
    const account = await near.account(this.signedAccountId);
    return account.signAndSendTransaction({
      receiverId,
      actions: actions.map((a) => createAction(a)),
    });
  }

  requestSignTransactionsUrl(txs: Array<transactions.Transaction>): string {
    const newUrl = new URL("sign", this.walletUrl);

    newUrl.searchParams.set(
      "transactions",
      txs
        .map((transaction) => borsh.serialize(SCHEMA.Transaction, transaction))
        .map((serialized) => Buffer.from(serialized).toString("base64"))
        .join(",")
    );
    newUrl.searchParams.set(
      "callbackUrl",
      new URL(window.location.href).toString()
    );

    return newUrl.toString();
  }

  async handlePopupTransaction<T>(
    url: string,
    callback: (result: WalletMessage) => T
  ): Promise<T> {
    const screenWidth = window.innerWidth || screen.width;
    const screenHeight = window.innerHeight || screen.height;
    const left = (screenWidth - DEFAULT_POPUP_WIDTH) / 2;
    const top = (screenHeight - DEFAULT_POPUP_HEIGHT) / 2;
    const childWindow = window.open(
      url,
      "MyNearWallet",
      `width=${DEFAULT_POPUP_WIDTH},height=${DEFAULT_POPUP_HEIGHT},top=${top},left=${left}`
    );

    if (!childWindow) {
      throw new Error(
        "Popup window blocked. Please allow popups for this site."
      );
    }

    return new Promise<T>((resolve, reject) => {
      const messageHandler = this.setupMessageHandler(
        resolve,
        reject,
        childWindow,
        callback
      );

      const intervalId = setInterval(() => {
        if (childWindow.closed) {
          window.removeEventListener("message", messageHandler);
          clearInterval(intervalId);
          reject(new Error("User closed the window"));
        }
      }, POLL_INTERVAL);
    });
  }

  private setupMessageHandler<T>(
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
    childWindow: Window | null,
    callback: (result: WalletMessage) => T
  ): (event: MessageEvent) => Promise<void> {
    const handler = async (event: MessageEvent) => {
      const message = event.data as WalletMessage;

      // check if the URL are the same
      const origin = new URL(event.origin);
      const walletBaseUrl = new URL(this.walletUrl);
      if (origin.origin !== walletBaseUrl.origin) {
        // eslint-disable-next-line no-console
        console.warn("Ignoring message from different origin", origin.origin);
        return;
      }

      switch (message.status) {
        case "success":
          childWindow?.close();
          resolve(callback(message));
          break;
        case "failure":
          childWindow?.close();
          reject(new Error(message.errorMessage || "Transaction failed"));
          break;
        default:
          // eslint-disable-next-line no-console
          console.warn("Unhandled message status:", message.status);
      }
    };

    window.addEventListener("message", handler);
    return handler;
  }
}
