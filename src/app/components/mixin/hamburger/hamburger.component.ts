import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-hamburger',
  templateUrl: './hamburger.component.html',
  styleUrls: ['./hamburger.component.css']
})
export class HamburgerComponent {
  private _isOpen: boolean = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: any,
    @Inject(DOCUMENT) private document: Document
  ) {}

  get isOpen(): boolean {
    return this._isOpen;
  }

  set isOpen(value: boolean) {
    this._isOpen = value;
    
    // 브라우저 환경에서만 DOM 조작
    if (isPlatformBrowser(this.platformId)) {
      // 메뉴가 열릴 때 배경 스크롤 방지
      if (value) {
        this.document.body.classList.add('no-scroll');
      } else {
        this.document.body.classList.remove('no-scroll');
      }
    }
  }

  // 컴포넌트 제거 시 스크롤 복원
  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.classList.remove('no-scroll');
    }
  }
}
