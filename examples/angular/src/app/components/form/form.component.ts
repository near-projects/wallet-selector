import type { OnInit } from "@angular/core";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Account } from "../../interfaces/account";

export type Submitted = SubmitEvent & {
  target: { elements: { [key: string]: HTMLInputElement } };
};

@Component({
  selector: "near-wallet-selector-form",
  templateUrl: "./form.component.html",
  styleUrls: ["./form.component.scss"],
})
export class FormComponent {
  @Input() account: Account;
  @Output() addMessage: EventEmitter<Submitted> = new EventEmitter();

  onSubmit(event: Submitted) {
    this.addMessage.emit(event);
  }
}
