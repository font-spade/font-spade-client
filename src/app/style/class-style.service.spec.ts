import { TestBed } from '@angular/core/testing';

import { ClassStyleService } from './class-style.service';

describe('ClassStyleService', () => {
  let service: ClassStyleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClassStyleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
