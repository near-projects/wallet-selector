import { createAppKit } from "@reown/appkit/react";
import { reconnect } from "@wagmi/core";
import { injected, walletConnect } from "@wagmi/connectors";
import { nearTestnet } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

// Get a project ID at https://cloud.walletconnect.com
const projectId = "30147604c5f01d0bc4482ab0665b5697";

const connectors = [
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

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  connectors,
  networks: [nearTestnet],
});

reconnect(wagmiAdapter.wagmiConfig);

export const web3Modal = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [nearTestnet],
  defaultNetwork: nearTestnet,
  enableWalletConnect: true,
  features: {
    analytics: true,
    swaps: false,
    onramp: false,
    email: false, // Smart accounts (Safe contract) not available on NEAR Protocol, only EOA.
    socials: false, // Smart accounts (Safe contract) not available on NEAR Protocol, only EOA.
  },
  coinbasePreference: "eoaOnly", // Smart accounts (Safe contract) not available on NEAR Protocol, only EOA.
});