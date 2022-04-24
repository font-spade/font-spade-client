import { TestBed } from '@angular/core/testing';

import { RightEmojiListService } from './right-emoji-list.service';

describe('RightEmojiListService', () => {
  let service: RightEmojiListService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RightEmojiListService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
