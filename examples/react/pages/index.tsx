import type { NextPage } from "next";
import { Fragment, useState } from "react";
import Content from "../components/Content";
import { ExportAccountSelectorContextProvider } from "../contexts/WalletSelectorExportContext";
import ExportContent from "../components/ExportContent";
import { wagmiAdapter, web3Modal } from "../wallets/web3modal";

import { WalletSelectorProvider } from "@near-wallet-selector/react-hook";

import { setupHereWallet } from "@near-wallet-selector/here-wallet";
import { setupMathWallet } from "@near-wallet-selector/math-wallet";
import { setupMeteorWallet } from "@near-wallet-selector/meteor-wallet";
import { setupMeteorWalletApp } from "@near-wallet-selector/meteor-wallet-app";
import { setupNarwallets } from "@near-wallet-selector/narwallets";
import { setupNearFi } from "@near-wallet-selector/nearfi";
import { setupNightly } from "@near-wallet-selector/nightly";
import { setupSender } from "@near-wallet-selector/sender";
import { setupBitgetWallet } from "@near-wallet-selector/bitget-wallet";
import { setupWalletConnect } from "@near-wallet-selector/wallet-connect";
import { setupWelldoneWallet } from "@near-wallet-selector/welldone-wallet";
import { setupNearSnap } from "@near-wallet-selector/near-snap";
import { setupNeth } from "@near-wallet-selector/neth";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import { setupLedger } from "@near-wallet-selector/ledger";
import { setupXDEFI } from "@near-wallet-selector/xdefi";
import { setupRamperWallet } from "@near-wallet-selector/ramper-wallet";
import { setupNearMobileWallet } from "@near-wallet-selector/near-mobile-wallet";
import { setupMintbaseWallet } from "@near-wallet-selector/mintbase-wallet";
import { setupBitteWallet } from "@near-wallet-selector/bitte-wallet";
import { setupOKXWallet } from "@near-wallet-selector/okx-wallet";
import { setupEthereumWallets } from "@near-wallet-selector/ethereum-wallets";

import { CONTRACT_ID, NETWORK_ID } from "../constants";
import { setupCoin98Wallet } from "@near-wallet-selector/coin98-wallet";

const walletSelectorConfig = {
  network: NETWORK_ID,
  debug: true,
  modules: [
    setupMyNearWallet(),
    setupLedger(),
    setupSender(),
    setupBitgetWallet(),
    setupMathWallet(),
    setupNightly(),
    setupMeteorWallet(),
    setupMeteorWalletApp({ contractId: CONTRACT_ID }),
    setupNearSnap(),
    setupOKXWallet(),
    setupNarwallets(),
    setupWelldoneWallet(),
    setupHereWallet(),
    setupCoin98Wallet(),
    setupNearFi(),
    setupRamperWallet(),
    setupNeth({
      gas: "300000000000000",
      bundle: false,
    }),
    setupXDEFI(),
    setupWalletConnect({
      projectId: "c4f79cc...",
      metadata: {
        name: "NEAR Wallet Selector",
        description: "Example dApp used by NEAR Wallet Selector",
        url: "https://github.com/near/wallet-selector",
        icons: ["https://avatars.githubusercontent.com/u/37784886"],
      },
    }),
    setupNearMobileWallet(),
    setupMintbaseWallet({ contractId: CONTRACT_ID }),
    setupBitteWallet({ contractId: CONTRACT_ID }),
    // setupEthereumWallets({ wagmiConfig, web3Modal }),
    setupEthereumWallets({
      wagmiConfig: wagmiAdapter.wagmiConfig,
      web3Modal,
    }),
  ],
};

const Home: NextPage = () => {
  const [showImport, setShowImport] = useState<boolean>(false);

  return (
    <Fragment>
      <div className="title-container">
        <h1>{showImport ? "Export Account" : "NEAR Guest Book"}</h1>
        <button onClick={() => setShowImport(!showImport)}>
          {showImport ? "Back to Log in" : "Try Export Account"}
        </button>
      </div>
      {showImport ? (
        <ExportAccountSelectorContextProvider>
          <ExportContent />
        </ExportAccountSelectorContextProvider>
      ) : (
        <WalletSelectorProvider config={walletSelectorConfig}>
          <Content />
        </WalletSelectorProvider>
      )}
    </Fragment>
  );
};

export default Home;
