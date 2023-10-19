import { Component, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-text-card',
  templateUrl: './text-card.component.html',
  styleUrls: ['./text-card.component.css']
})
export class TextCardComponent {
  @Input()
  title: string = '';
  @Input()
  description: string = '';

  constructor (private translateService: TranslateService) {
  }

}

export enum TextCardType {
  'default',
  'shadow1',
  'shadow2',
}
