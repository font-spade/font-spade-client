import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HomeModule } from './pages/home/home.module';
import { HeaderModule } from './layout/header/header.module';
import { FooterModule } from './layout/footer/footer.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { VectorModule } from './components/vector/vector.module';
import { IntroModule } from './pages/intro/intro.module';
import { AlertModalModule } from './components/modal/alert-modal/alert-modal.module';
import { DatePickerModule } from './components/common/date-picker/date-picker.module';
import { AdBannerModule } from './components/common/ad-banner/ad-banner.module';
import { AdsModule } from './pages/ads/ads.module';
import { TextArtModule } from './pages/text-art/text-art.module';
import { ImgTextArtModule } from './pages/img-text-art/img-text-art.module';
import { EmojiKitchenModule } from './pages/emoji-kitchen/emoji-kitchen.module';
import { EmojiKitchenService } from './pages/emoji-kitchen/emoji-kitchen.service';
import { ToastModule } from './components/common/toast/toast.module';
//
// export function initializeApp(emojiService: EmojiKitchenService) {
//   return () => emojiService;
// }

// TranslateLoader 초기화 함수
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, '/assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    VectorModule,
    ClipboardModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    HomeModule,
    FooterModule,
    HeaderModule,
    IntroModule,
    AlertModalModule,
    DatePickerModule,
    AdBannerModule,
    AdsModule,
    TextArtModule,
    ImgTextArtModule,
    EmojiKitchenModule,
    ToastModule
  ],
  providers: [ provideClientHydration() ,
    EmojiKitchenService,
    // {
    //   provide: APP_INITIALIZER,
    //   useFactory: initializeApp,
    //   deps: [EmojiKitchenService],
    //   multi: true,
    // }
    ],
  bootstrap: [AppComponent]
})
export class AppModule { }
