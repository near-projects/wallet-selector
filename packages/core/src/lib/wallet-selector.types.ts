import { Observable } from "rxjs";

import { Wallet, WalletModuleFactory } from "./wallet/wallet.types";
import { WalletSelectorState } from "./store.types";
import { Network, NetworkId, Options } from "./options.types";
import type { WalletSelectorUIComponent } from "./modal";
import { Subscription, StorageService } from "./services";

export interface WalletSelectorParams {
  network: NetworkId | Network;
  contractId: string;
  methodNames?: Array<string>;
  modules: Array<WalletModuleFactory>;
  ui?: () => Promise<WalletSelectorUIComponent & HTMLElement>;
  storage?: StorageService;
  debug?: boolean;
}

export interface WalletSelectorStore {
  getState: () => WalletSelectorState;
  observable: Observable<WalletSelectorState>;
}

export type WalletSelectorEvents = {
  networkChanged: { walletId: string; networkId: string };
};

// TODO: Remove extending once modal is a separate package.
export interface WalletSelector {
  options: Options;
  connected: boolean;

  store: WalletSelectorStore;

  wallet<Variation extends Wallet = Wallet>(id?: string): Promise<Variation>;

  on<EventName extends keyof WalletSelectorEvents>(
    eventName: EventName,
    callback: (event: WalletSelectorEvents[EventName]) => void
  ): Subscription;

  off<EventName extends keyof WalletSelectorEvents>(
    eventName: EventName,
    callback: (event: WalletSelectorEvents[EventName]) => void
  ): void;
}
