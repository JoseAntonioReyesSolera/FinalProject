import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpperComponent } from './helpper.component';

describe('HelpperComponent', () => {
  let component: HelpperComponent;
  let fixture: ComponentFixture<HelpperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HelpperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
