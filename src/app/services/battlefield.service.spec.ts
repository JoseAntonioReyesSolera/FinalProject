import { TestBed } from '@angular/core/testing';

import { BattlefieldService } from './battlefield.service';

describe('BattlefieldService', () => {
  let service: BattlefieldService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BattlefieldService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
