import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraveyardComponent } from './graveyard.component';

describe('GraveyardComponent', () => {
  let component: GraveyardComponent;
  let fixture: ComponentFixture<GraveyardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GraveyardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GraveyardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
