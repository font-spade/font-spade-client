import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { EmojiKitchenService } from './pages/emoji-kitchen/emoji-kitchen.service';
import { Subscription } from 'rxjs';
import { ToastService } from './components/common/toast/toast.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit{
  title = 'font-spade';
  public testBrowser  : boolean | undefined;
  public data         : any;
  private subscription: Subscription;

  constructor(private translateService: TranslateService,
              private emojiService: EmojiKitchenService,
              private toastService: ToastService,
              private http: HttpClient, @Inject(PLATFORM_ID) platformId: string) {
    // 초기 언어 설정
    translateService.setDefaultLang('ko'); // 한국어로 설정
    // 번역된 문자열 가져오기
    this.translateService.use('ko'); // 언어 변경
    const translatedText = this.translateService.instant('Helloworld');
    console.log(translatedText); // 번역된 문자열 출력
  }

  public toastMessage : string | null = '';
  switchLocale(locale: string) {
    this.translateService.use(locale);
  }

  async ngOnInit () {
    this.subscription = this.toastService.toastState.subscribe((message) => {
      this.toastMessage = message;
      setTimeout(() => {
        this.toastMessage = null;
      }, 3000); // Hide the toast after 3 seconds
    });
  }
}
