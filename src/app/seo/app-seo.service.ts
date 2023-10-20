import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class AppSeoService {

  constructor(private title: Title, private meta: Meta) { }

  setSeoData(data: any) {
    this.title.setTitle(data.title);
    this.meta.addTags([
      { name: 'author', content: data.author },
      { name: 'keywords', content: data.keywords },
      { name: 'description', content: data.description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: data.title },
      { property: 'og:description', content: data.description },
      { property: 'og:site_name', content: data.site_name },
      { property: 'og:url', content: 'https://www.loeaf.com/' },
      { property: 'og:images', content: data.src },
      { property: 'og:images:alt', content: data.description },
      { property: 'og:images:width', content: '1200' },
      { property: 'og:images:height', content: '639' }
    ]);

    // favicon 및 기타 링크 설정
    this.meta.addTags([
      { rel: 'icon', href: '/assets/favicon.ico' },
      { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/assets/favicon-16x16.png' },
    ]);
  }
}

interface SeoData {
  author: string;
  keywords: string;
  title: string;
  description: string;
  site_name: string;
  src: string;
}
