import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeftEmojiListComponent } from './left-emoji-list.component';

describe('LeftEmojiListComponent', () => {
  let component: LeftEmojiListComponent;
  let fixture: ComponentFixture<LeftEmojiListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LeftEmojiListComponent]
    });
    fixture = TestBed.createComponent(LeftEmojiListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
