import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-check-box',
  templateUrl: './check-box.component.html',
  styleUrls: ['./check-box.component.css']
})
export class CheckBoxComponent {
  isChecked = false;
  @Input()
  labelName: string = '';
  @Output()
  checkEvt = new EventEmitter<boolean>();
}
