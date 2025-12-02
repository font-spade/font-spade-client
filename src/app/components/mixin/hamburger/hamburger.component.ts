import { Component } from '@angular/core';

@Component({
  selector: 'app-hamburger',
  templateUrl: './hamburger.component.html',
  styleUrls: ['./hamburger.component.css']
})
export class HamburgerComponent {
  private _isOpen: boolean = false;

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
    
    // 메뉴가 열릴 때 배경 스크롤 방지
    if (value) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }

  // 컴포넌트 제거 시 스크롤 복원
  ngOnDestroy() {
    document.body.classList.remove('no-scroll');
  }
}
