import React, { Fragment, useEffect, useState } from "react";
import type {
  BrowserWalletBehaviour,
  InjectedWalletBehaviour,
  ModuleState,
  Wallet,
  WalletSelector,
  AccountImportData,
  InjectedWalletMetadata,
} from "@near-wallet-selector/core";

import * as nearAPI from "near-api-js";
import type {
  FunctionCallPermissionView,
  AccessKeyView,
  AccountView,
} from "near-api-js/lib/providers/provider";

import { AccountSelect } from "./AccountSelect";
import { Passphrase } from "./Passphrase";
import { NoInterface } from "./NoInterface";
import { Complete } from "./Complete";

import { encryptAccountData } from "../helpers";

type CompleteProps = {
  accounts: Array<string>;
  walletName: string;
};
interface ExportAccountProps {
  alertMessage: string | null;
  module?: ModuleState;
  onCloseModal: () => void;
  onWarning: () => void;
  onBack: () => void;
  accounts: Array<AccountImportData>;
  selector: WalletSelector;
  wallet: ModuleState<Wallet>;
  onComplete?: (object: CompleteProps) => void;
}

const EXPORT_ACCOUNT_STEPS = {
  ACCOUNT_SELECTION: "ACCOUNT_SELECTION",
  GET_PASSPHRASE: "GET_PASSPHRASE",
  NO_INTERFACE: "NO_INTERFACE",
  COMPLETE: "COMPLETE",
};

export const ACCESS_KEY_TYPES = {
  LEDGER: "Ledger",
  FULL_ACCESS_KEY: "Full Access Key",
  MULTI_SIG: "Multi-Sig",
  UNKNOWN: "Unknown",
};

const permissionToType = (
  permission: string | FunctionCallPermissionView
): string => {
  if (permission === "FullAccess") {
    return ACCESS_KEY_TYPES.FULL_ACCESS_KEY;
  }
  //@ts-ignore
  if (permission?.FunctionCall?.method_names.includes("__wallet__metadata")) {
    return ACCESS_KEY_TYPES.LEDGER;
  }
  const multiSigMethods = [
    "add_request",
    "add_request_and_confirm",
    "delete_request",
    "confirm",
  ];
  if (
    //@ts-ignore
    permission?.FunctionCall?.method_names.every((method: string) =>
      multiSigMethods.includes(method)
    )
  ) {
    return ACCESS_KEY_TYPES.MULTI_SIG;
  }
  return ACCESS_KEY_TYPES.UNKNOWN;
};

interface getAccountTypeProps {
  provider: nearAPI.providers.Provider;
  accountId: string;
  publicKey: string;
}

const getAccountType = async ({
  provider,
  accountId,
  publicKey,
}: getAccountTypeProps) => {
  try {
    const { permission } = await provider.query<AccessKeyView>({
      request_type: "view_access_key",
      account_id: accountId,
      public_key: publicKey,
      finality: "final",
    });
    const type = permissionToType(permission);
    return { type };
  } catch {
    return { type: ACCESS_KEY_TYPES.UNKNOWN };
  }
};

interface getAccountBalanceProps {
  provider: nearAPI.providers.Provider;
  accountId: string;
}

const getAccountBalance = async ({
  provider,
  accountId,
}: getAccountBalanceProps) => {
  try {
    const { amount } = await provider.query<AccountView>({
      request_type: "view_account",
      finality: "final",
      account_id: accountId,
    });
    const bn = BigInt(amount);
    return { hasBalance: bn !== BigInt(0) };
  } catch {
    return { hasBalance: false };
  }
};

export interface ExportAccountData {
  accountId: string;
  privateKey: string;
  hasBalance: boolean;
  type: string;
}

export const ExportAccount: React.FC<ExportAccountProps> = ({
  alertMessage,
  module,
  onCloseModal,
  onWarning,
  accounts,
  selector,
  wallet,
  onBack,
  onComplete,
}) => {
  const [selectedAccounts, setSelectedAccounts] = useState<Array<string>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accountsWithDetail, setAccountsWithDetail] = useState<
    Array<ExportAccountData>
  >([]);
  const [disabledAccounts, setDisabledAccounts] = useState<
    Array<ExportAccountData>
  >([]);

  const [passphrase, setPassphrase] = useState<string>("");

  //@ts-ignore
  const [exportInterfaces, setExportInterfaces] = useState<{
    buildImportAccountsUrl?: BrowserWalletBehaviour["buildImportAccountsUrl"];
    importAccountsInSecureContext?: InjectedWalletBehaviour["importAccountsInSecureContext"];
  }>({});
  useEffect(() => {
    const getExportInterfaces = async () => {
      try {
        const {
          // @ts-ignore
          buildImportAccountsUrl,
          // @ts-ignore
          importAccountsInSecureContext,
        } = await wallet.wallet();
        setExportInterfaces({
          buildImportAccountsUrl,
          importAccountsInSecureContext,
        });
        if (!buildImportAccountsUrl && !importAccountsInSecureContext) {
          onWarning();
        }
      } catch (e) {
        onWarning();
      }
    };
    getExportInterfaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.metadata.name, alertMessage]);

  const { network } = selector.options;
  const provider = new nearAPI.providers.JsonRpcProvider({
    url: network.nodeUrl,
  });
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      const accountsWithDetails = await Promise.all(
        accounts.map(async ({ accountId, privateKey }) => {
          const keyPair = nearAPI.utils.KeyPair.fromString(
            privateKey as nearAPI.utils.KeyPairString
          );
          const { type } = await getAccountType({
            provider,
            accountId,
            publicKey: keyPair.getPublicKey().toString(),
          });
          const { hasBalance } = await getAccountBalance({
            provider,
            accountId,
          });

          return {
            accountId,
            privateKey,
            type,
            hasBalance,
          };
        })
      );
      const availableAccounts = accountsWithDetails.filter(
        ({ hasBalance, type }) => {
          return hasBalance && type === ACCESS_KEY_TYPES.FULL_ACCESS_KEY;
        }
      );
      setAccountsWithDetail(availableAccounts);

      const unavailableAccounts = accountsWithDetails.filter(
        ({ hasBalance, type }) => {
          return !hasBalance || type !== ACCESS_KEY_TYPES.FULL_ACCESS_KEY;
        }
      );
      setDisabledAccounts(unavailableAccounts);
      setIsLoading(false);
    };
    if (accountsWithDetail.length === 0) {
      initialize();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    exportInterfaces.buildImportAccountsUrl,
    exportInterfaces.importAccountsInSecureContext,
  ]);

  const [step, setStep] = useState(EXPORT_ACCOUNT_STEPS.ACCOUNT_SELECTION);

  useEffect(() => {
    if (alertMessage) {
      setStep(EXPORT_ACCOUNT_STEPS.NO_INTERFACE);
    } else {
      setStep(EXPORT_ACCOUNT_STEPS.ACCOUNT_SELECTION);
    }
  }, [alertMessage]);

  const showAccountSelection = () =>
    setStep(EXPORT_ACCOUNT_STEPS.ACCOUNT_SELECTION);

  const showPassPhrase = () => {
    setStep(EXPORT_ACCOUNT_STEPS.GET_PASSPHRASE);
  };

  const { buildImportAccountsUrl, importAccountsInSecureContext } =
    exportInterfaces;

  const onAccountSelectNext = () => {
    if (
      wallet.type === "injected" &&
      !(wallet.metadata as InjectedWalletMetadata).useUrlAccountImport
    ) {
      injectedWalletInterface();
      setStep(EXPORT_ACCOUNT_STEPS.COMPLETE);
    } else {
      showPassPhrase();
    }
  };

  const injectedWalletInterface = async () => {
    if (importAccountsInSecureContext) {
      await importAccountsInSecureContext({
        accounts: accounts.filter(({ accountId }) =>
          selectedAccounts.includes(accountId)
        ),
      });
    } else {
      setStep(EXPORT_ACCOUNT_STEPS.NO_INTERFACE);
    }
  };

  const browserOrMobileInterface = () => {
    const encryptedAccountData = encryptAccountData({
      accountData: accounts.filter(({ accountId }) =>
        selectedAccounts.includes(accountId)
      ),
      secretKey: passphrase,
    });
    const isUrlCompatible =
      wallet.type === "browser" ||
      (wallet.metadata as InjectedWalletMetadata).useUrlAccountImport;
    if (isUrlCompatible && buildImportAccountsUrl) {
      const url = `${buildImportAccountsUrl()}#${encryptedAccountData}`;
      window.open(url, "_blank");
    }
    setStep(EXPORT_ACCOUNT_STEPS.COMPLETE);
  };

  const onTransferComplete = () => {
    if (onComplete) {
      onComplete({
        accounts: selectedAccounts,
        walletName: module?.metadata.name || "Unknown",
      });
    }
  };

  return (
    <Fragment>
      {step === EXPORT_ACCOUNT_STEPS.NO_INTERFACE && (
        <NoInterface
          src={module?.metadata.iconUrl}
          name={module?.metadata.name}
          alertMessage={alertMessage}
          onBack={onBack}
          onCloseModal={onCloseModal}
        />
      )}
      {step === EXPORT_ACCOUNT_STEPS.ACCOUNT_SELECTION && (
        <AccountSelect
          onCloseModal={onCloseModal}
          onBack={onBack}
          selectedAccounts={selectedAccounts}
          setSelectedAccounts={setSelectedAccounts}
          accountsWithDetail={accountsWithDetail}
          disabledAccounts={disabledAccounts}
          onNextStep={onAccountSelectNext}
          isLoading={isLoading}
          buttonLabel={
            wallet.type === "injected"
              ? "modal.exportAccounts.getPassphrase.button"
              : "modal.exportAccounts.selectAccounts.button"
          }
        />
      )}
      {step === EXPORT_ACCOUNT_STEPS.GET_PASSPHRASE && (
        <Passphrase
          onNextStep={browserOrMobileInterface}
          hasCopied={hasCopied}
          setHasCopied={setHasCopied}
          onCloseModal={onCloseModal}
          onBack={showAccountSelection}
          onPassphraseSave={setPassphrase}
        />
      )}
      {step === EXPORT_ACCOUNT_STEPS.COMPLETE && (
        <Complete
          onCloseModal={onCloseModal}
          onBack={showPassPhrase}
          onComplete={onTransferComplete}
          onStartOver={onBack}
        />
      )}
    </Fragment>
  );
};
