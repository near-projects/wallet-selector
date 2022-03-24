import ProviderService, {
  QueryParams,
  ViewAccessKeyParams,
} from "./ProviderService";
import { mock } from "jest-mock-extended";
import {
  FinalExecutionOutcome,
  JsonRpcProvider,
} from "near-api-js/lib/providers";
import { providers } from "near-api-js";
import {
  createQueryResponseMock,
  createViewAccessKeyResponseMock,
} from "./providerServiceMocks";
import { SignedTransaction } from "near-api-js/lib/transaction";
import {
  BlockReference,
  BlockResult,
} from "near-api-js/lib/providers/provider";

const defaults = {
  url: "https://rpc.testnet.near.org",
};

const setup = (url: string) => {
  const provider = mock<JsonRpcProvider>();

  jest.spyOn(providers, "JsonRpcProvider").mockImplementation(() => provider);

  return {
    provider,
    service: new ProviderService(url),
  };
};

afterEach(() => {
  jest.resetAllMocks();
});

describe("query", () => {
  it("forwards params to the near-api-js JsonRpcProvider", async () => {
    const { service, provider } = setup(defaults.url);
    const params: QueryParams = {
      request_type: "call_function",
      finality: "final",
      account_id: "accountId",
      method_name: "methodName",
      args_base64: "e30=",
    };

    provider.query.mockResolvedValue(createQueryResponseMock());

    await service.query(params);

    expect(provider.query).toHaveBeenCalledWith(params);
  });

  it("correctly parses the response", async () => {
    const { service, provider } = setup(defaults.url);
    const data = createQueryResponseMock();

    provider.query.mockResolvedValue(data);

    const response = await service.query({
      request_type: "call_function",
      finality: "final",
      account_id: "accountId",
      method_name: "methodName",
      args_base64: "e30=",
    });

    expect(response).toEqual(data);
  });
});

describe("viewAccessKey", () => {
  it("forwards params to the near-api-js JsonRpcProvider", async () => {
    const { service, provider } = setup(defaults.url);
    const params: ViewAccessKeyParams = {
      accountId: "accountId",
      publicKey: "publicKey",
    };

    provider.query.mockResolvedValue(createViewAccessKeyResponseMock());

    await service.viewAccessKey(params);

    expect(provider.query).toHaveBeenCalledWith({
      request_type: "view_access_key",
      finality: "final",
      account_id: params.accountId,
      public_key: params.publicKey,
    });
  });

  it("correctly parses the response", async () => {
    const { service, provider } = setup(defaults.url);
    const data = createViewAccessKeyResponseMock();

    provider.query.mockResolvedValue(data);

    const response = await service.viewAccessKey({
      accountId: "accountId",
      publicKey: "publicKey",
    });

    expect(response).toEqual(data);
  });
});

describe("block", () => {
  it("forwards params to the near-api-js JsonRpcProvider", async () => {
    const { service, provider } = setup(defaults.url);
    const reference = {} as BlockReference;

    provider.block.mockResolvedValue({} as BlockResult);

    await service.block(reference);

    expect(provider.block).toHaveBeenCalledWith(reference);
  });

  it("correctly parses the response", async () => {
    const { service, provider } = setup(defaults.url);
    const reference = {} as BlockReference;
    const data = {} as BlockResult;

    provider.block.mockResolvedValue(data);

    const response = await service.block(reference);

    expect(response).toEqual(data);
  });
});

describe("sendTransaction", () => {
  it("forwards params to the near-api-js JsonRpcProvider", async () => {
    const { service, provider } = setup(defaults.url);
    const signedTransaction = {} as SignedTransaction;

    provider.sendTransaction.mockResolvedValue({} as FinalExecutionOutcome);

    await service.sendTransaction(signedTransaction);

    expect(provider.sendTransaction).toHaveBeenCalledWith(signedTransaction);
  });

  it("correctly parses the response", async () => {
    const { service, provider } = setup(defaults.url);
    const signedTransaction = {} as SignedTransaction;
    const data = {} as FinalExecutionOutcome;

    provider.sendTransaction.mockResolvedValue(data);

    const response = await service.sendTransaction(signedTransaction);

    expect(response).toEqual(data);
  });
});
