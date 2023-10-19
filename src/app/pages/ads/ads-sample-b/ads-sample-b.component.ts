import { Component, Input } from '@angular/core';
import { AdComponent } from '../../../components/common/ad-banner/ad-banner.component';

@Component({
  selector: 'app-ads-sample-b',
  templateUrl: './ads-sample-b.component.html',
  styleUrls: ['./ads-sample-b.component.css']
})
export class AdsSampleBComponent implements AdComponent {
  @Input() data: any;
}
