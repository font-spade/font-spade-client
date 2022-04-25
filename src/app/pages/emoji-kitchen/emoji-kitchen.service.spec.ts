import { TestBed } from '@angular/core/testing';

import { EmojiKitchenService } from './emoji-kitchen.service';

describe('EmojiKitchenService', () => {
  let service: EmojiKitchenService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EmojiKitchenService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
