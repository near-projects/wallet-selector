import { utils } from 'near-api-js';
import { Wallet } from './near-wallet';

const wallet = new Wallet({ network: 'testnet' });

// Button clicks
document.querySelector('#sign-in-button').onclick = () => { wallet.signIn(); };
document.querySelector('#sign-out-button').onclick = () => { wallet.signOut(); };

// UI: Display the signed-out container
function signedOutUI() {
  document.querySelector('#sign-in-button').classList.remove('d-none');
  document.querySelector('#sign-out-button').classList.add('d-none')
  document.querySelector('#guest-book-form').classList.add('d-none');
}

// UI: Displaying the signed in flow container and fill in account-specific data
function signedInUI(signedAccount) {
  document.querySelector('#guest-book-form').classList.remove('d-none');
  document.querySelector('#sign-in-button').classList.add('d-none');
  document.querySelector('#sign-out-button').classList.remove('d-none')
  document.querySelectorAll('[data-behavior=account-id]').forEach(el => {
    el.innerText = signedAccount;
  });
}

function renderMessages(messages, container) {
  container.innerHTML = '';

  const reversedMessages = [...messages].reverse();

  reversedMessages.forEach((message) => {
    const messageElement = document.createElement('p');
    messageElement.className = message.premium ? 'is-premium' : '';
    messageElement.innerHTML = `
      <strong>${message.sender}</strong>:<br />
      ${message.text}
    `;
    container.appendChild(messageElement);
  });
}

window.onload = async () => {
  await wallet.startUp((signedAccount) =>{
    signedAccount ? signedInUI(signedAccount) : signedOutUI();
    document.querySelector('#account-id').innerText = `, ${signedAccount}!`;
  });
  const messages = await wallet.viewMethod({ contractId: 'guest-book.testnet', method: 'getMessages' });
  renderMessages(messages, document.querySelector('#messages'));

  document.querySelector('#guest-book-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = document.querySelector('#message').value;
    const donation = document.querySelector('#donation').value;
    await wallet.callMethod({ contractId: 'guest-book.testnet', method: 'addMessage', args: { text: message },deposit: utils.format.parseNearAmount(donation) });
    const messages = await wallet.viewMethod({ contractId: 'guest-book.testnet', method: 'getMessages' });
    renderMessages(messages, document.querySelector('#messages'));
  });

}
