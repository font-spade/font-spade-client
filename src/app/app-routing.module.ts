import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { IntroComponent } from './pages/intro/intro.component';
import { TextArtComponent } from './pages/text-art/text-art.component';
import { ImgTextArtComponent } from './pages/img-text-art/img-text-art.component';
import { EmojiKitchenComponent } from './pages/emoji-kitchen/emoji-kitchen.component';
import { EmojiTextComponent } from './pages/emoji-text/emoji-text.component';
import { MerryChristmasComponent } from './pages/merry-christmas/merry-christmas.component';
import { MessageWriteComponent } from './pages/message-write/message-write.component';
import { KakaoCallbackComponent } from './auth/kakao-callback.component';

const routes: Routes = [
  // { path: 'home', component: HomeComponent},
  { path: '', redirectTo: '/4spot', pathMatch: 'full' },
  { path: 'intro', component: IntroComponent},
  { path: 'emoji-generate', component: EmojiKitchenComponent },
  { path: 'emoticon-generate' , component: HomeComponent },
  { path: 'emoji-text-generate' , component: EmojiTextComponent },
  { path: 'ascii-art', component: TextArtComponent},
  { path: 'image-ascii-art', component: ImgTextArtComponent},
  { path: '4spot', component: MerryChristmasComponent},
  { path: '4spot/:id', component: MerryChristmasComponent},
  { path: 'tree/:id', redirectTo: '/4spot/:id', pathMatch: 'full' },
  { path: 'merry-christmas', redirectTo: '/4spot', pathMatch: 'full' },
  { path: 'message-write', component: MessageWriteComponent},
  { path: 'auth/kakao/callback', component: KakaoCallbackComponent},
  { path: '**', redirectTo: '/' } // 이것이 맨 마지막에 있어야 함
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
