import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TurnTimelineComponent } from './turn-timeline.component';

describe('TurnTimelineComponent', () => {
  let component: TurnTimelineComponent;
  let fixture: ComponentFixture<TurnTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnTimelineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TurnTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
