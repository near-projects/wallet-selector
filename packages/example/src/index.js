import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import getConfig from "./config.js";
import NearWalletSelector from "near-wallet-selector";

// Initializing contract
async function initContract() {
  // get network configuration values from config.js
  // based on the network ID we pass to getConfig()
  const nearConfig = getConfig(process.env.NEAR_ENV || "testnet");

  const near = new NearWalletSelector({
    wallets: ["near-wallet", "sender-wallet", "ledger-wallet"],
    networkId: "testnet",
    theme: "light",
    contract: {
      accountId: nearConfig.contractName
    },
    walletSelectorUI: {
      description: "Please select a wallet to connect to this dApp:",
      explanation: [
        "Wallets are used to send, receive, and store digital assets.",
        "There are different types of wallets. They can be an extension",
        "added to your browser, a hardware device plugged into your",
        "computer, web-based, or as an app on your phone.",
      ].join(" "),
    },
  });

  await near.init();

  return {
    near,
    initialAccount: await near.getAccount(),
  };
}

window.onload = () => {
  initContract()
    .then(({ near, initialAccount }) => {
      ReactDOM.render(
        <App near={near} initialAccount={initialAccount} />,
        document.getElementById("root")
      );
    })
    .catch((err) => {
      console.log("Failed to initialise at root");
      console.error(err);
    });
};
