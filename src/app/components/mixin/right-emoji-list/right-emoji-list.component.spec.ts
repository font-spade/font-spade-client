import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightEmojiListComponent } from './right-emoji-list.component';

describe('RightEmojiListComponent', () => {
  let component: RightEmojiListComponent;
  let fixture: ComponentFixture<RightEmojiListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RightEmojiListComponent]
    });
    fixture = TestBed.createComponent(RightEmojiListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
