import { Component } from '@angular/core';
import { ClassStyleService } from '../../style/class-style.service';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.component.html',
  styleUrls: ['./intro.component.css']
})
export class IntroComponent {
  constructor(public classStyleSvc: ClassStyleService) { }

}
