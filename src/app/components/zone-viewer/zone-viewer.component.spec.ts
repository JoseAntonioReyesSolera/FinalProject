import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneViewerCompComponent } from './zone-viewer.component';

describe('ZoneViewerCompComponent', () => {
  let component: ZoneViewerCompComponent;
  let fixture: ComponentFixture<ZoneViewerCompComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoneViewerCompComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZoneViewerCompComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
