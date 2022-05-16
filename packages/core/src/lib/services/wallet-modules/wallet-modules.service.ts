import { WalletModulesParams } from "./wallet-modules.service.types";
import {
  Wallet,
  WalletEvents,
  WalletModule,
  WalletModuleFactory,
} from "../../wallet";
import { StorageService } from "../storage/storage.service.types";
import { Options } from "../../options.types";
import { AccountState, ModuleState, Store } from "../../store.types";
import { EventEmitter } from "../event-emitter/event-emitter.service";
import { WalletSelectorEvents } from "../../wallet-selector.types";
import { Logger, logger } from "../logger/logger.service";
import { PACKAGE_NAME, PENDING_SELECTED_WALLET_ID } from "../../constants";
import { JsonStorage } from "../storage/json-storage.service";
import { Provider } from "../provider/provider.service";

export class WalletModules {
  private factories: Array<WalletModuleFactory>;
  private storage: StorageService;
  private options: Options;
  private store: Store;
  private emitter: EventEmitter<WalletSelectorEvents>;

  private modules: Array<ModuleState>;
  private instances: Record<string, Wallet>;

  constructor({
    factories,
    storage,
    options,
    store,
    emitter,
  }: WalletModulesParams) {
    this.factories = factories;
    this.storage = storage;
    this.options = options;
    this.store = store;
    this.emitter = emitter;

    this.modules = [];
    this.instances = {};
  }

  private async validateWallet(id: string | null) {
    let accounts: Array<AccountState> = [];
    const wallet = await this.getWallet(id);

    if (wallet) {
      // Ensure our persistent state aligns with the selected wallet.
      // For example a wallet is selected, but it returns no accounts (not connected).
      accounts = await wallet.getAccounts().catch((err) => {
        logger.log(`Failed to validate ${wallet.id} during setup`);
        logger.error(err);

        return [];
      });
    }

    return accounts;
  }

  private async getSelectedWallet() {
    const jsonStorage = new JsonStorage(this.storage, PACKAGE_NAME);
    const pendingSelectedWalletId = await jsonStorage.getItem<string>(
      PENDING_SELECTED_WALLET_ID
    );

    if (pendingSelectedWalletId) {
      const accounts = await this.validateWallet(pendingSelectedWalletId);

      await jsonStorage.removeItem(PENDING_SELECTED_WALLET_ID);

      if (accounts.length) {
        const { selectedWalletId } = this.store.getState();
        const selectedWallet = await this.getWallet(selectedWalletId);

        if (selectedWallet && pendingSelectedWalletId !== selectedWalletId) {
          await selectedWallet.disconnect().catch((err) => {
            logger.log("Failed to disconnect existing wallet");
            logger.error(err);
          });
        }

        return {
          accounts,
          selectedWalletId: pendingSelectedWalletId,
        };
      }
    }

    const { selectedWalletId } = this.store.getState();
    const accounts = await this.validateWallet(selectedWalletId);

    return {
      accounts,
      selectedWalletId: accounts.length ? selectedWalletId : null,
    };
  }

  private async disconnectWallet(walletId: string) {
    const wallet = (await this.getWallet(walletId))!;

    await wallet.disconnect().catch((err) => {
      logger.log(`Failed to disconnect ${wallet.id}`);
      logger.error(err);

      // At least clean up state on our side.
      this.onWalletDisconnected(wallet.id);
    });
  }

  private async onWalletConnected(
    walletId: string,
    { accounts }: WalletEvents["connected"]
  ) {
    const { selectedWalletId } = this.store.getState();

    if (!accounts.length) {
      const module = this.getModule(walletId)!;
      // We can't guarantee the user will actually sign in with browser wallets.
      // Best we can do is set in storage and validate on init.
      if (module.type === "browser") {
        const jsonStorage = new JsonStorage(this.storage, PACKAGE_NAME);
        await jsonStorage.setItem(PENDING_SELECTED_WALLET_ID, walletId);
      }

      return;
    }

    if (selectedWalletId && selectedWalletId !== walletId) {
      await this.disconnectWallet(selectedWalletId);
    }

    this.store.dispatch({
      type: "WALLET_CONNECTED",
      payload: { walletId, accounts },
    });
  }

  private onWalletDisconnected(walletId: string) {
    this.store.dispatch({
      type: "WALLET_DISCONNECTED",
      payload: { walletId },
    });
  }

  private setupWalletEmitter(module: WalletModule) {
    const emitter = new EventEmitter<WalletEvents>();

    emitter.on("disconnected", () => {
      this.onWalletDisconnected(module.id);
    });

    emitter.on("connected", (event) => {
      this.onWalletConnected(module.id, event);
    });

    emitter.on("accountsChanged", async ({ accounts }) => {
      if (!accounts.length) {
        return this.disconnectWallet(module.id);
      }

      this.store.dispatch({
        type: "ACCOUNTS_CHANGED",
        payload: { walletId: module.id, accounts },
      });
    });

    emitter.on("networkChanged", ({ networkId }) => {
      this.emitter.emit("networkChanged", { walletId: module.id, networkId });
    });

    return emitter;
  }

  private decorateWallet(wallet: Wallet): Wallet {
    const _connect = wallet.connect;
    const _disconnect = wallet.disconnect;

    wallet.connect = async (params: never) => {
      const accounts = await _connect(params);
      await this.onWalletConnected(wallet.id, { accounts });

      return accounts;
    };

    wallet.disconnect = async () => {
      await _disconnect();
      this.onWalletDisconnected(wallet.id);
    };

    return wallet;
  }

  private async setupInstance(module: WalletModule): Promise<Wallet> {
    const wallet = {
      id: module.id,
      type: module.type,
      metadata: module.metadata,
      ...(await module.init({
        id: module.id,
        type: module.type,
        metadata: module.metadata,
        options: this.options,
        provider: new Provider(this.options.network.nodeUrl),
        emitter: this.setupWalletEmitter(module),
        logger: new Logger(module.id),
        storage: new JsonStorage(this.storage, [PACKAGE_NAME, module.id]),
      })),
    } as Wallet;

    return this.decorateWallet(wallet);
  }

  private getModule(id: string | null) {
    return this.modules.find((x) => x.id === id);
  }

  async getWallet<Variation extends Wallet = Wallet>(id: string | null) {
    const module = this.getModule(id);

    if (!module) {
      return null;
    }

    return (await module.wallet()) as Variation;
  }

  async setup() {
    const modules: Array<ModuleState> = [];

    for (let i = 0; i < this.factories.length; i += 1) {
      const module = await this.factories[i]().catch((err) => {
        logger.log("Failed to setup module");
        logger.error(err);

        return null;
      });

      // Filter out wallets that aren't available.
      if (!module) {
        continue;
      }

      if (modules.some((x) => x.id === module.id)) {
        throw new Error("Duplicate module id detected: " + module.id);
      }

      modules.push({
        id: module.id,
        type: module.type,
        metadata: module.metadata,
        wallet: async () => {
          let instance = this.instances[module.id];

          if (instance) {
            return instance;
          }

          instance = await this.setupInstance(module);

          this.instances[module.id] = instance;

          return instance;
        },
      });
    }

    this.modules = modules;

    const { accounts, selectedWalletId } = await this.getSelectedWallet();

    this.store.dispatch({
      type: "SETUP_WALLET_MODULES",
      payload: {
        modules,
        accounts,
        selectedWalletId,
      },
    });
  }
}
