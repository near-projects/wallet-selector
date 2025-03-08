import type { OnInit } from "@angular/core";
import type { AccountState, WalletSelector } from "@near-wallet-selector/core";
import { setupWalletSelector } from "@near-wallet-selector/core";
import type { WalletSelectorModal } from "@near-wallet-selector/modal-ui-js";
import { setupModal } from "@near-wallet-selector/modal-ui-js";
import { setupSender } from "@near-wallet-selector/sender";
import { setupBitgetWallet } from "@near-wallet-selector/bitget-wallet";
import { setupXDEFI } from "@near-wallet-selector/xdefi";
import { setupMathWallet } from "@near-wallet-selector/math-wallet";
import { setupNightly } from "@near-wallet-selector/nightly";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMeteorWalletApp } from "@near-wallet-selector/meteor-wallet-app";
import { setupHotWallet } from "@near-wallet-selector/hot-wallet";
import { setupNarwallets } from "@near-wallet-selector/narwallets";
import { setupWelldoneWallet } from "@near-wallet-selector/welldone-wallet";
import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupCoin98Wallet } from "@near-wallet-selector/coin98-wallet";
import { setupNearFi } from "@near-wallet-selector/nearfi";
import { setupNearSnap } from "@near-wallet-selector/near-snap";
import { setupNeth } from "@near-wallet-selector/neth";
import { setupWalletConnect } from "@near-wallet-selector/wallet-connect";
import { Component } from "@angular/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupRamperWallet } from "@near-wallet-selector/ramper-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupNearMobileWallet } from "@near-wallet-selector/near-mobile-wallet";
import { setupMintbaseWallet } from "@near-wallet-selector/mintbase-wallet";
import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
import { setupOKXWallet } from "@near-wallet-selector/okx-wallet";
import { setupEthereumWallets } from "@near-wallet-selector/ethereum-wallets";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import { defineChain } from "@reown/appkit/networks";
import type { CreateConnectorFn } from "@wagmi/core";
import { injected, walletConnect } from "@wagmi/connectors";
import { CONTRACT_ID } from "../../../constants";

declare global {
  interface Window {
    selector: WalletSelector;
    modal: WalletSelectorModal;
  }
}

// Get a project ID at https://cloud.reown.com
const projectId = "30147604c5f01d0bc4482ab0665b5697";

const near = defineChain({
  id: 398,
  caipNetworkId: "eip155:398",
  chainNamespace: "eip155",
  name: "NEAR Protocol Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "NEAR",
    symbol: "NEAR",
  },
  rpcUrls: {
    default: { http: ["https://eth-rpc.testnet.near.org"] },
    public: { http: ["https://eth-rpc.testnet.near.org"] },
  },
  blockExplorers: {
    default: {
      name: "NEAR Explorer",
      url: "https://eth-explorer-testnet.near.org",
    },
  },
  testnet: true,
});

const connectors: Array<CreateConnectorFn> = [
  walletConnect({
    projectId,
    metadata: {
      name: "NEAR Guest Book",
      description: "A guest book with comments stored on the NEAR blockchain",
      url: "https://near.github.io/wallet-selector",
      icons: ["https://near.github.io/wallet-selector/favicon.ico"],
    },
    showQrModal: false, // showQrModal must be false
  }),
  injected({ shimDisconnect: true }),
];

const wagmiAdapter = new WagmiAdapter({
  projectId,
  connectors,
  networks: [near],
});

const web3Modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [near],
  defaultNetwork: near,
  enableWalletConnect: true,
  features: {
    analytics: true,
    swaps: false,
    onramp: false,
    email: false, // Smart accounts (Safe contract) not available on NEAR Protocol, only EOA.
    socials: false, // Smart accounts (Safe contract) not available on NEAR Protocol, only EOA.
  },
  coinbasePreference: "eoaOnly", // Smart accounts (Safe contract) not available on NEAR Protocol, only EOA.
  allWallets: "SHOW",
});

@Component({
  selector: "near-wallet-selector-wallet-selector",
  templateUrl: "./wallet-selector.component.html",
  styleUrls: ["./wallet-selector.component.scss"],
})
export class WalletSelectorComponent implements OnInit {
  selector: WalletSelector;
  modal: WalletSelectorModal;
  accountId: string | null;
  accounts: Array<AccountState> = [];

  async ngOnInit() {
    await this.initialize().catch((err) => {
      console.error(err);
      alert("Failed to initialise wallet selector");
    });
  }

  async initialize() {
    const _selector = await setupWalletSelector({
      network: "testnet",
      debug: true,
      modules: [
        setupMyNearWallet(),
        setupLedger(),
        setupSender(),
        setupBitgetWallet(),
        setupXDEFI(),
        setupMathWallet(),
        setupNightly(),
        setupMeteorWallet(),
        setupMeteorWalletApp({ contractId: CONTRACT_ID }),
        setupOKXWallet(),
        setupHotWallet(),
        setupNarwallets(),
        setupWelldoneWallet(),
        setupHereWallet(),
        setupCoin98Wallet(),
        setupNearFi(),
        setupNearSnap(),
        setupNeth({
          bundle: false,
        }),
        setupWalletConnect({
          projectId: "c8cb6204543639c31aef44ea4837a554", // Replace this with your own projectId form WalletConnect.
          // Overrides the default methods on wallet-connect.ts
          // the near_signMessage and near_verifyOwner are missing here.
          methods: [
            "near_signIn",
            "near_signOut",
            "near_getAccounts",
            "near_signTransaction",
            "near_signTransactions",
          ],
          metadata: {
            name: "NEAR Wallet Selector",
            description: "Example dApp used by NEAR Wallet Selector",
            url: "https://github.com/near/wallet-selector",
            icons: ["https://avatars.githubusercontent.com/u/37784886"],
          },
        }),
        setupRamperWallet(),
        setupNearMobileWallet(),
        setupMintbaseWallet({ contractId: CONTRACT_ID }),
        setupBitteWallet({ contractId: CONTRACT_ID }),
        setupEthereumWallets({
          wagmiConfig: wagmiAdapter.wagmiConfig,
          web3Modal,
        }),
      ],
    });

    const _modal = setupModal(_selector, {
      contractId: CONTRACT_ID,
    });
    const state = _selector.store.getState();

    this.accounts = state.accounts;
    this.accountId =
      state.accounts.find((account) => account.active)?.accountId || null;

    window.selector = _selector;
    window.modal = _modal;

    this.selector = _selector;
    this.modal = _modal;
  }
}
