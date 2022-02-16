import React from "react";
import ReactDOM from "react-dom";

import WalletController from "../controllers/WalletController";
import Contract from "./Contract";
import Modal from "../modal/Modal";
import EventHandler, { Emitter, EventList } from "../utils/EventsHandler";
import getConfig, { NetworkId } from "../config";
import ProviderService from "../services/provider/ProviderService";
import { updateState } from "../state/State";
import { MODAL_ELEMENT_ID } from "../constants";

export type BuiltInWalletId = "near-wallet" | "sender-wallet" | "ledger-wallet";

export interface Options {
  wallets: Array<BuiltInWalletId>;
  networkId: NetworkId;
  theme: "dark" | "light" | null;
  contract: {
    accountId: string;
    viewMethods?: Array<string>;
    changeMethods?: Array<string>;
  };
  walletSelectorUI: {
    description: string;
    explanation: string;
  };
}

export default class NearWalletSelector {
  private options: Options;

  private emitter: Emitter;
  private controller: WalletController;

  contract: Contract;

  constructor(options: Options) {
    const config = getConfig(options.networkId);

    const emitter = new EventHandler();
    const provider = new ProviderService(config.nodeUrl);
    const controller = new WalletController(options, provider, emitter);
    const contract = new Contract(options, provider, controller);

    this.options = options;
    this.emitter = emitter;
    this.controller = controller;
    this.contract = contract;
  }

  private renderModal() {
    const el = document.createElement("div");
    el.id = MODAL_ELEMENT_ID;
    document.body.appendChild(el);

    ReactDOM.render(
      <Modal options={this.options} wallets={this.controller.getWallets()} />,
      document.getElementById(MODAL_ELEMENT_ID)
    );
  }

  async init() {
    await this.controller.init();

    this.renderModal();
  }

  show() {
    updateState((prevState) => ({
      ...prevState,
      showModal: true,
      showWalletOptions: true,
      showLedgerDerivationPath: false,
      showSenderWalletNotInstalled: false,
      showSwitchNetwork: false,
    }));
  }

  hide() {
    updateState((prevState) => ({
      ...prevState,
      showModal: false,
    }));
  }

  signIn(walletId: BuiltInWalletId) {
    return this.controller.signIn(walletId);
  }

  signOut() {
    return this.controller.signOut();
  }

  isSignedIn() {
    return this.controller.isSignedIn();
  }

  getAccount() {
    return this.controller.getAccount();
  }

  on(event: EventList, callback: () => void) {
    this.emitter.on(event, callback);
  }

  off(event: EventList, callback: () => void) {
    this.emitter.off(event, callback);
  }
}
