import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-large-use-card',
  templateUrl: './large-use-card.component.html',
  styleUrls: ['./large-use-card.component.css']
})
export class LargeUseCardComponent {
  @Input()
  title: string = '';
  subtitle: string = '체험하기';

}
