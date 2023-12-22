import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { IntroComponent } from './pages/intro/intro.component';
import { TextArtComponent } from './pages/text-art/text-art.component';
import { ImgTextArtComponent } from './pages/img-text-art/img-text-art.component';
import { EmojiKitchenComponent } from './pages/emoji-kitchen/emoji-kitchen.component';

const routes: Routes = [
  // { path: 'home', component: HomeComponent},
  { path: '', redirectTo: '/emoji-kitchen', pathMatch: 'full' },
  { path: 'intro', component: IntroComponent},
  { path: 'emoji-kitchen', component: EmojiKitchenComponent },
  { path: 'ascii-emoji-generate' , component: HomeComponent },
  { path: 'ascii-art', component: TextArtComponent},
  { path: 'image-ascii-art', component: ImgTextArtComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
