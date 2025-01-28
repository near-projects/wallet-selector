import type {
  Account,
  Wallet,
  WalletModuleFactory,
} from "./wallet/wallet.types";
import type { ReadOnlyStore } from "./store.types";
import type { Network, NetworkId, Options } from "./options.types";
import type { Subscription, StorageService } from "./services";
import type { SupportedLanguage } from "./translate/translate";
import type { SignMessageMethod } from "./wallet/wallet.types";
import type { Transaction } from "./wallet/transactions.types";
import type { providers } from "near-api-js";

export interface WalletSelectorParams {
  /**
   * Resolved network configuration.
   */
  network: NetworkId | Network;
  /**
   * List of wallet module factory functions
   */
  modules: Array<WalletModuleFactory>;
  /**
   * Custom storage service
   */
  storage?: StorageService;
  /**
   * Whether internal logging is enabled.
   */
  debug?: boolean;
  /**
   * Whether wallet order optimization is enabled.
   */
  optimizeWalletOrder?: boolean;
  /**
   * Wether to allow multiple wallet selector instances to be created.
   */
  allowMultipleSelectors?: boolean;
  /**
   * Weather wallet order randomization is enabled.
   */
  randomizeWalletOrder?: boolean;
  /**
   * ISO 639-1 two-letter language code.
   */
  languageCode?: SupportedLanguage;
  /**
   * The URL where DelegateActions are sent by meta transaction enabled wallet modules.
   */
  relayerUrl?: string;
  /**
   * Whether multiple RPC URLs are included, used for the FailoverRpcProvider.
   */
  fallbackRpcUrls?: Array<string>;
}

export type WalletSelectorStore = ReadOnlyStore;

export type WalletSelectorEvents = {
  signedIn: {
    walletId: string;
    contractId: string;
    methodNames: Array<string>;
    accounts: Array<Account>;
  };
  signedOut: {
    walletId: string;
  };
  accountsChanged: { walletId: string; accounts: Array<Account> };
  networkChanged: { walletId: string; networkId: string };
  uriChanged: { walletId: string; uri: string };
};

export interface WalletSelector {
  /**
   * Resolved variation of the options passed to `setupWalletSelector`.
   */
  options: Options;
  /**
   * Wallet selector storage service
   */
  store: WalletSelectorStore;

  /**
   * Programmatically access wallets and call their methods.
   * It's advised to use `state.modules` if you only need access to `id`, `type` or `metadata` as it avoids initialising.
   * You can find more information on Wallet {@link https://github.com/near/wallet-selector/blob/main/packages/core/docs/api/wallet.md | here}.
   */
  wallet<Variation extends Wallet = Wallet>(
    id?: string
  ): Promise<Variation & SignMessageMethod>;

  /**
   * Determines whether we're signed in to one or more accounts.
   */
  isSignedIn(): boolean;

  /**
   * Programmatically change active account which will be used to sign and send transactions.
   */
  setActiveAccount(accountId: string): void;

  /**
   * Programmatically changes the rememberRecentWallets behavior, it can deactivate and activate rememberRecentWallets.
   */
  setRememberRecentWallets(): void;

  /**
   * Attach an event handler to important events.
   */
  on<EventName extends keyof WalletSelectorEvents>(
    eventName: EventName,
    callback: (event: WalletSelectorEvents[EventName]) => void
  ): Subscription;

  /**
   * Removes the event handler attached to the given `event`.
   */
  off<EventName extends keyof WalletSelectorEvents>(
    eventName: EventName,
    callback: (event: WalletSelectorEvents[EventName]) => void
  ): void;

  /**
   * Sets up a callback function that triggers whenever the user logs in or out.
   */
  subscribeOnAccountChange(onAccountChangeFn: (account: string) => void): void;

  /**
   * Executes a view function on a specified smart contract.
   */
  viewMethod({
    contractId,
    method,
    args,
  }: {
    contractId: string;
    method: string;
    args?: Record<string, unknown>;
  }): Promise<unknown>;

  /**
   * Executes a mutable function on a specified smart contract.
   * Requires to be signed in.
   * @throws {Error} if a user isn't signed in
   */
  callMethod({
    contractId,
    method,
    args,
    gas,
    amount,
  }: {
    contractId: string;
    method: string;
    args?: Record<string, unknown>;
    gas?: string;
    amount?: string;
  }): Promise<unknown>;

  /**
   * Sign Out from the active wallet
   */
  signOut(): void;

  /**
   * Retrieves the account's balance in yoctoNear by querying the specified account's state.
   * Requires to be signed in.
   * @throws {Error} if a user isn't signed in
   */
  getSignedAccountBalance(): Promise<string | undefined>;

  /**
   * Requests the wallet to sign a transaction or batch of transactions.
   */
  signAndSendTransactions({
    transactions,
  }: {
    transactions: Array<Transaction>;
  }): Promise<void | Array<providers.FinalExecutionOutcome>>;
}
