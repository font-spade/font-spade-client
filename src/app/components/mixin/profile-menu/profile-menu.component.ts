import { Component } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.css'],
  animations: [
    trigger('showHideAnimation', [
      state('true', style({ height: '*' })),
      state('false', style({ height: '0' })),
      transition('true <=> false', animate('300ms ease-in-out')), // 변경 가능한 애니메이션 지속 시간 설정
    ]),
  ],
})
export class ProfileMenuComponent {
  isActive = true;

  toggleUI() {
    this.isActive = !this.isActive;
  }
}
