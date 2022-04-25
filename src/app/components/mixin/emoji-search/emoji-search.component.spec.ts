import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmojiSearchComponent } from './emoji-search.component';

describe('EmojiSearchComponent', () => {
  let component: EmojiSearchComponent;
  let fixture: ComponentFixture<EmojiSearchComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmojiSearchComponent]
    });
    fixture = TestBed.createComponent(EmojiSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
