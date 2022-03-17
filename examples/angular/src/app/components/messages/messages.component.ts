import {Component, Input } from '@angular/core';
import { Message } from "../../interfaces/message";

@Component({
  selector: 'near-wallet-selector-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent {
  @Input() messages: Message[];
}
