import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmojiKitchenComponent } from './emoji-kitchen.component';

describe('EmojiKitchenComponent', () => {
  let component: EmojiKitchenComponent;
  let fixture: ComponentFixture<EmojiKitchenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmojiKitchenComponent]
    });
    fixture = TestBed.createComponent(EmojiKitchenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
