import { AfterViewInit, Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { ChevronType } from '../../vector/chevron-icon/chevron-icon.component';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-locale-list-box',
  templateUrl: './locale-list-box.component.html',
  styleUrls: ['./locale-list-box.component.css']
})
export class LocaleListBoxComponent implements OnInit, AfterViewInit{

  type = ChevronType.DOWN;
  isActive: boolean = false;
  localeStr: any = '';
  localeDisplayMap: any;

  constructor (private translateService: TranslateService, private elementRef: ElementRef) {

    this.localeStr = localeDisplayMap[this.translateService.currentLang];
  }

  ngAfterViewInit(): void {
  }

  toggleType () {
    this.type = this.type === ChevronType.UP ? ChevronType.DOWN : ChevronType.UP;
    setTimeout(() => {this.isActive = !this.isActive;});
  }

  changeLocale (locale: string) {
    this.translateService.use(locale); // 언어 변경
    this.localeStr = localeDisplayMap[locale];
    this.isActive = false;
  }

  ngOnInit (): void {
    // map to list
    this.localeDisplayMap =
      Object.entries(localeDisplayMap)
              .map(([key, value]) => ({ key, value }));
  }

  // Detect clicks on the document
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      // Click occurred outside the component, close it
      this.isActive = false;
      this.type = ChevronType.DOWN;
    }
  }
}

export const localeType = {
  KO: 'ko',
  EN: 'en',
  JA: 'ja'
}

export const localeDisplayMap = {
  [localeType.KO]: '한국어',
  [localeType.EN]: 'English',
  [localeType.JA]: '日本語'
}
