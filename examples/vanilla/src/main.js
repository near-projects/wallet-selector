import { Wallet } from './near-wallet';
import Observable from './Observable';

const wallet = new Wallet({ network: 'testnet' });


const observable = new Observable();
observable.subscribe((signedAccount) => {
  signedAccount ? signedInUI(signedAccount) : signedOutUI();
  document.querySelector('#account-id').innerText = `, ${signedAccount}!`;
});



// Button clicks
document.querySelector('#sign-in-button').onclick = () => { wallet.signIn(); };
document.querySelector('#sign-out-button').onclick = () => { wallet.signOut(); };

// UI: Display the signed-out container
function signedOutUI() {
  document.querySelector('#sign-in-button').classList.remove('d-none');
  document.querySelector('#sign-out-button').classList.add('d-none')
}

// UI: Displaying the signed in flow container and fill in account-specific data
function signedInUI(signedAccount) {
  document.querySelector('#sign-in-button').classList.add('d-none');
  document.querySelector('#sign-out-button').classList.remove('d-none')
  document.querySelectorAll('[data-behavior=account-id]').forEach(el => {
    el.innerText = signedAccount;
  });
}

function renderMessages(messages, container) {

  container.innerHTML = '';

  messages.forEach((message) => {
    const messageElement = document.createElement('p');
    messageElement.className = message.premium ? 'is-premium' : '';
    messageElement.innerHTML = `
      <strong>${message.sender}</strong>:<br />
      ${message.text}
    `;
    container.appendChild(messageElement);
  });
}


//
window.onload = async () => {
  await wallet.startUp((data) => observable.notify(data));
  const messages = await wallet.viewMethod({ contractId: 'test.testnet', method: 'getMessages' });
  renderMessages(messages, document.querySelector('#messages'));
}