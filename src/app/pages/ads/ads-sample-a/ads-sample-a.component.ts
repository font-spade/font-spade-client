import { Component, Input } from '@angular/core';
import { AdComponent } from '../../../components/common/ad-banner/ad-banner.component';

@Component({
  selector: 'app-ads-sample-a',
  templateUrl: './ads-sample-a.component.html',
  styleUrls: ['./ads-sample-a.component.css']
})
export class AdsSampleAComponent implements AdComponent {
  @Input() data: any;
}
