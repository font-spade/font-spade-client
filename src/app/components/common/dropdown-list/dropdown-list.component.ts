import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ChevronType } from '../../vector/chevron-icon/chevron-icon.component';

@Component({
  selector: 'app-dropdown-list',
  templateUrl: './dropdown-list.component.html',
  styleUrls: ['./dropdown-list.component.css']
})
export class DropdownListComponent {
  dropdownValue: any;
  showDropdown: any = false;
  @Input()
  dateLabel: any;
  @Input()
  data: any;
  @Output()
  onSelected = new EventEmitter<any>();

  selectData (y: any) {
    this.dropdownValue = y.value;
    this.showDropdown = false;
    this.onSelected.emit(y);
  }

  protected readonly ChevronType = ChevronType;
}
