import State from "../types/State";
import { LOCALSTORAGE_SIGNED_IN_WALLET_KEY } from "../constants";

const state: { current: State } = {
  current: {
    showModal: false,
    showWalletOptions: true,
    showLedgerDerivationPath: false,
    showSenderWalletNotInstalled: false,
    showSwitchNetwork: false,
    options: {
      theme: null,
      networkId: "testnet",
      wallets: ["nearwallet", "senderwallet", "ledgerwallet"],
      customWallets: {},
      walletSelectorUI: {
        description: "",
        explanation: "",
      },
      contract: {
        address: "",
        viewMethods: [],
        changeMethods: [],
      },
    },
    walletProviders: {},
    isSignedIn:
      localStorage.getItem(LOCALSTORAGE_SIGNED_IN_WALLET_KEY) !== null,
    signedInWalletId: localStorage.getItem(LOCALSTORAGE_SIGNED_IN_WALLET_KEY),
    nearConnection: null,
  },
};

export const updateState = (func: (prevState: State) => State) => {
  const nextState = func(state.current);
  state.current = nextState;
  if (window.updateWalletSelector) {
    window.updateWalletSelector(nextState);
  }
};

export const getState = () => {
  return state.current;
};
