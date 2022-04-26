import { TestBed } from '@angular/core/testing';

import { LeftEmojiListService } from './left-emoji-list.service';

describe('LeftEmojiListService', () => {
  let service: LeftEmojiListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LeftEmojiListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
