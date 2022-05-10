## API Reference (Selector)

### `.options`

**Returns**

- `network` (`Network`): Resolved network configuration.
  - `networkId` (`string`): Network ID (e.g. `testnet`).
  - `nodeUrl` (`string`): URL for RPC requests.
  - `helperUrl` (`string`): URL for creating accounts.
  - `explorerUrl` (`string`): URL for the NEAR explorer.
- `contractId` (`string`): Account ID of the Smart Contract used for `connect` and signing transactions.
- `methodNames` (`Array<string>?`): List of methods that can only be accessed on the Smart Contract.
- `debug` (`boolean`): Whether internal logging is enabled.

**Description**

Resolved variation of the options passed to `setupWalletSelector`.

**Example**

```ts
console.log(selector.options); // { contractId: "guest-book.testnet", ... }
```

### `.connected`

**Returns**

- `boolean`

**Description**

Determines whether we're connected to one or more accounts.

**Example**

```ts
console.log(selector.connected); // true
```

### `.store.getState()`

****Parameters****

- N/A

**Returns**

- `WalletSelectorState`

**Description**

Retrieve the current state. You can find more information on `WalletSelectorState` [here](./state.md).

**Example**

```ts
const state = selector.store.getState();
console.log(state); // { modules: [{ id: "near-wallet", ... }], ... }
```

### `.store.observable`

**Returns**

- `Observable<WalletSelectorState>`

**Description**

Subscribe to state changes using the (RxJS) Observable pattern. You can find more information on `WalletSelectorState` [here](./state.md).

**Example**

```ts
import { map, distinctUntilChanged } from "rxjs";

// Subscribe to all state changes.
selector.store.observable.subscribe((state) => {
  console.log("State changed:", state);
});

// Subscribe to account state changes.
selector.store.observable
  .pipe(
    map((state) => state.accounts),
    distinctUntilChanged()
  )
  .subscribe((accounts) => {
    console.log("Accounts changed", accounts);
  });
```

### `.wallet(id)`

**Parameters**

- `id` (`string?`): ID of wallet. Defaults to the selected wallet.

**Returns**

- `Promise<Wallet>`

**Description**

Programmatically access wallets and call their methods. It's advised to use `state.modules` if you only need access to `id`, `type` or `metadata` as it avoids initialising. You can find more information on `Wallet` [here](./wallet.md).

> Note: This function will throw when calling without an ID and there is no selected wallet.  

**Example**

```ts
// Selected wallet.
(async () => {
  const wallet = await selector.wallet();
  const accounts = await wallet.getAccounts();
})();

// Specific wallet.
(async () => {
  const wallet = await selector.wallet("near-wallet");
  const accounts = await wallet.connect();
})();
```

### `.show()`

****Parameters****

- N/A

**Returns**

- `void`

**Description**

Opens the modal for users to connect to their preferred wallet. You can also use this method to switch wallets.

**Example**

```ts
selector.show();
```

### `.hide()`

**Parameters**

- N/A

**Returns**

- `void`

**Description**

Closes the modal.

**Example**

```ts
selector.hide();
```

### `.on(event, callback)`

**Parameters**

- `event` (`string`): Name of the event. This can be: `networkChanged`.
- `callback` (`Function`): Handler to be triggered when the `event` fires.

**Returns**

- `Subscription`

**Description**

Attach an event handler to important events.

**Example**

```ts
const subscription = selector.on("networkChanged", ({ networkId }) => {
   console.log(`Network changed to ${networkId}`);
});

// Unsubscribe.
subscription.remove();
```

### `.off(event, callback)`

**Parameters**

- `event` (`string`): Name of the event. This can be: `networkChanged`.
- `callback` (`Function`): Original handler passed to `.on(event, callback)`.

**Returns**

- `void`

**Description**

Removes the event handler attached to the given `event`.

**Example**

```ts
const handleNetworkChanged = ({
  networkId
}: WalletSelectorEvents["networkChanged"]) => {
  console.log(`Network changed to ${networkId}`);
}

selector.on("networkChanged", handleNetworkChanged);
selector.off("networkChanged", handleNetworkChanged);
```
