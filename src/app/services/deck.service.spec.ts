import { TestBed } from '@angular/core/testing';

import { DeckService } from './deck.service';

describe('DeckServiceService', () => {
  let service: DeckService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeckService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
