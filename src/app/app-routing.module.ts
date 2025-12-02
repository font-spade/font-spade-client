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

const routes: Routes = [
  // { path: 'home', component: HomeComponent},
  { path: '', redirectTo: '/merry-christmas', pathMatch: 'full' },
  { path: 'intro', component: IntroComponent},
  { path: 'emoji-generate', component: EmojiKitchenComponent },
  { path: 'emoticon-generate' , component: HomeComponent },
  { path: 'emoji-text-generate' , component: EmojiTextComponent },
  { path: 'ascii-art', component: TextArtComponent},
  { path: 'image-ascii-art', component: ImgTextArtComponent},
  { path: 'merry-christmas', component: MerryChristmasComponent},
  { path: 'message-write', component: MessageWriteComponent},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
