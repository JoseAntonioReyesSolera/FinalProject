import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermanentCardComponent } from './permanent-card.component';

describe('PermanentCardComponent', () => {
  let component: PermanentCardComponent;
  let fixture: ComponentFixture<PermanentCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermanentCardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermanentCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
