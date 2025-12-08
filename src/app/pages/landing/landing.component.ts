import { Component } from '@angular/core';

@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent {
  
  constructor() { 
    console.log('🎄 단우야! 아빠가 만든 트리야~ 사랑해! ❤️');
  }

  navigateToTree(): void {
    window.open('/4spot', '_blank');
  }

  scrollToFeatures(): void {
    const element = document.getElementById('features');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToHowItWorks(): void {
    const element = document.getElementById('how-it-works');
    element?.scrollIntoView({ behavior: 'smooth' });
  }
}