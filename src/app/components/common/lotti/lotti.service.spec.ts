import { TestBed } from '@angular/core/testing';

import { LottiService } from './lotti.service';

describe('LottiService', () => {
  let service: LottiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LottiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
