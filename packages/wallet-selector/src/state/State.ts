export interface State {
  showModal: boolean;
  showWalletOptions: boolean;
  showLedgerDerivationPath: boolean;
  showSenderWalletNotInstalled: boolean;
  showSwitchNetwork: boolean;
  selectedWalletId: string | null;
}

const state: { current: State } = {
  current: {
    showModal: false,
    showWalletOptions: true,
    showLedgerDerivationPath: false,
    showSenderWalletNotInstalled: false,
    showSwitchNetwork: false,
    selectedWalletId: null,
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
