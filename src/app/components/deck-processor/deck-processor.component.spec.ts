import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeckProcessorComponent } from './deck-processor.component';

describe('DeckProcessorComponent', () => {
  let component: DeckProcessorComponent;
  let fixture: ComponentFixture<DeckProcessorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeckProcessorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeckProcessorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
