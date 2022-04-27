import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MiddleEmojiListComponent } from './middle-emoji-list.component';

describe('MiddleEmojiListComponent', () => {
  let component: MiddleEmojiListComponent;
  let fixture: ComponentFixture<MiddleEmojiListComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MiddleEmojiListComponent]
    });
    fixture = TestBed.createComponent(MiddleEmojiListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
