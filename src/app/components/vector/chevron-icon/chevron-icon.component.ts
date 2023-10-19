import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-chevron-icon',
  templateUrl: './chevron-icon.component.html',
  styleUrls: ['./chevron-icon.component.css']
})
export class ChevronIconComponent {
  @Input() public type: ChevronType = ChevronType.UP;

  getRotationStyle() {
    return { transform: this.type };
  }
}

export enum ChevronType {
  UP = 'rotate(90deg)',
  DOWN = 'rotate(270deg)',
  LEFT = 'rotate(0deg)',
  RIGHT = 'rotate(180deg)',
}
