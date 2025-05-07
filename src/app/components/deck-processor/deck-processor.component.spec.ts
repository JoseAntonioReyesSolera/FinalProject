import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeckProcessorComponent } from './deck-processor.component';
import { ScryfallService } from '../../services/scryfall.service';
import { DeckService } from '../../services/deck.service';
import { DomSanitizer } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

describe('DeckProcessorComponent', () => {
  let component: DeckProcessorComponent;
  let fixture: ComponentFixture<DeckProcessorComponent>;
  let scryfallServiceSpy: jasmine.SpyObj<ScryfallService>;
  let deckServiceSpy: jasmine.SpyObj<DeckService>;
  let sanitizerSpy: jasmine.SpyObj<DomSanitizer>;

  beforeEach(async () => {
    const scryfallMock = jasmine.createSpyObj('ScryfallService', ['getCardByName']);
    const deckMock = jasmine.createSpyObj('DeckService', ['setDeckCards']);
    const sanitizerMock = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);

    await TestBed.configureTestingModule({
      imports: [],
      declarations: [DeckProcessorComponent],
      providers: [
        { provide: ScryfallService, useValue: scryfallMock },
        { provide: DeckService, useValue: deckMock },
        { provide: DomSanitizer, useValue: sanitizerMock },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeckProcessorComponent);
    component = fixture.componentInstance;
    scryfallServiceSpy = TestBed.inject(ScryfallService) as jasmine.SpyObj<ScryfallService>;
    deckServiceSpy = TestBed.inject(DeckService) as jasmine.SpyObj<DeckService>;
    sanitizerSpy = TestBed.inject(DomSanitizer) as jasmine.SpyObj<DomSanitizer>;
  });

  it('should parse deck input correctly', () => {
    component.deckInput = '2 Lightning Bolt\n1 Mountain\n\nSIDEBOARD:\n1 Pyroblast';
    component.processDeckInput();

    expect(component.deckMainList).toEqual([
      { quantity: 2, name: 'Lightning Bolt' },
      { quantity: 1, name: 'Mountain' }
    ]);

    expect(component.deckSideboardList).toEqual([
      { quantity: 1, name: 'Pyroblast' }
    ]);
  });

  it('should call setDeckCards with loaded cards', () => {
    component.deckMainList = [{ name: 'Lightning Bolt', quantity: 1 }];
    component.deckSideboardList = [{ name: 'Pyroblast', quantity: 1 }];

    const mockCard: any = {
      id: '123',
      name: 'Lightning Bolt',
      image_uris: { normal: 'url' },
      oracle_text: 'Deal 3 damage.',
      type_line: 'Instant',
      mana_cost: '{R}',
      cmc: 1,
      power: null,
      toughness: null,
      loyalty: null,
      keywords: [],
      produced_mana: ['R'],
      color_identity: ['R'],
      card_faces: null,
    };

    scryfallServiceSpy.getCardByName.and.returnValues(
      of({ ...mockCard, id: '123' }),
      of({ ...mockCard, id: '456', name: 'Pyroblast' })
    );
    sanitizerSpy.bypassSecurityTrustHtml.and.callFake((html) => html);

    component.loadDeck();

    expect(scryfallServiceSpy.getCardByName).toHaveBeenCalledTimes(2);
    expect(deckServiceSpy.setDeckCards).toHaveBeenCalled();
  });

  it('should handle load error gracefully', () => {
    component.deckMainList = [{ name: 'Bad Card', quantity: 1 }];
    scryfallServiceSpy.getCardByName.and.returnValue(throwError(() => ({ error: { details: 'Card not found' } })));

    component.loadDeck();

    expect(component.loadError).toContain('Verifica que los nombres estén correctos');
  });

  it('should replace mana symbols and highlight text correctly', () => {
    const html = component['replaceManaSymbolsAndHighlightTriggers']('Whenever you cast a spell, {G}: Add {G}.', ['Trample']);
    expect(html).toContain('<img');
    expect(html).toContain('text-warning');
    expect(html).toContain('text-info');
  });

  it('should toggle card face correctly', () => {
    const card: any = {
      name: 'Card A',
      card_faces: [
        { name: 'Face 1', image_uris: {}, oracle_text: 'Text 1', type_line: 'Type 1', mana_cost: '{G}' },
        { name: 'Face 2', image_uris: {}, oracle_text: 'Text 2', type_line: 'Type 2', mana_cost: '{U}' }
      ],
      currentFaceIndex: 0,
      keywords: []
    };

    sanitizerSpy.bypassSecurityTrustHtml.and.callFake((html) => html);

    component.toggleCardFace(card);

    expect(card.name).toBe('Face 2');
    expect(card.currentFaceIndex).toBe(1);
  });
});
