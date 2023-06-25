import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { IntroComponent } from './pages/intro/intro.component';
import { TextArtComponent } from './pages/text-art/text-art.component';
import { ImgTextArtComponent } from './pages/img-text-art/img-text-art.component';

const routes: Routes = [
  { path: 'home', component: HomeComponent},
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'intro', component: IntroComponent},
  { path: 'text-art', component: TextArtComponent},
  { path: 'img-text-art', component: ImgTextArtComponent}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
