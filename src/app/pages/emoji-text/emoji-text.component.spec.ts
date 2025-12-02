import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmojiTextComponent } from './emoji-text.component';

describe('EmojiTextComponent', () => {
  let component: EmojiTextComponent;
  let fixture: ComponentFixture<EmojiTextComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmojiTextComponent]
    });
    fixture = TestBed.createComponent(EmojiTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
