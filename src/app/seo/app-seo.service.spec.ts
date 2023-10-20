import { TestBed } from '@angular/core/testing';

import { AppSeoService } from './app-seo.service';

describe('AppSeoService', () => {
  let service: AppSeoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppSeoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
