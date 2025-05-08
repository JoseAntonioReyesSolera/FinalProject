import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BattlefieldComponent } from './battlefield.component';
import { DeckService } from '../../services/deck.service';
import { BattlefieldService } from '../../services/battlefield.service';
import { of } from 'rxjs';
import { Permanent } from '../../models/permanent';
import { Cart } from '../../models/cart';

describe('BattlefieldComponent', () => {
  let component: BattlefieldComponent;
  let fixture: ComponentFixture<BattlefieldComponent>;

  // Cart de ejemplo
  const exampleCart: Cart = {
    id: 'c1',
    name: 'Grizzly Bears',
    oracle_text: 'Just a bear.',
    type_line: 'Creature — Bear',
    mana_cost: '{1}{G}',
    cmc: 2,
    quantity: 1,
    currentFaceIndex: 0,
    isSingleImageDoubleFace: false,
    isCommander: false,
    zone: 'battlefield',
    sanitizedManaCost: '',
    sanitizedProducedMana: '',
    sanitizedOracleText: '',
    card_faces: [],
  };

  // Permanents de prueba
  const mockPermanents: Permanent[] = [
    {
      instanceId: '1',
      cardId: 'card1',
      name: 'Forest',
      image: '',
      tapped: false,
      counters: {},
      oracle_text: '',
      type: 'Land',
      originalCard: { ...exampleCart, name: 'Forest', type_line: 'Basic Land — Forest' },
    },
    {
      instanceId: '2',
      cardId: 'card2',
      name: 'Grizzly Bears',
      image: '',
      power: 2,
      toughness: 2,
      tapped: false,
      counters: {},
      oracle_text: '',
      type: 'Creature',
      originalCard: exampleCart,
    },
    {
      instanceId: '3',
      cardId: 'card3',
      name: 'Mind Stone',
      image: '',
      tapped: false,
      counters: {},
      oracle_text: '',
      type: 'Artifact',
      originalCard: { ...exampleCart, name: 'Mind Stone', type_line: 'Artifact' },
    },
  ];

  const deckServiceMock = {
    getDeckCards: jasmine.createSpy().and.returnValue(of([exampleCart])),
    getOriginalDeckCards: jasmine.createSpy().and.returnValue(of([exampleCart])),
    moveCardToZone: jasmine.createSpy(),
  };

  const battlefieldServiceMock = {
    permanents$: of(mockPermanents),
    removePermanent: jasmine.createSpy(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BattlefieldComponent],
      providers: [
        { provide: DeckService, useValue: deckServiceMock },
        { provide: BattlefieldService, useValue: battlefieldServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BattlefieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly separate permanents into rows', () => {
    component.creaturesRow.subscribe(row => {
      expect(row.length).toBe(1);
      expect(row[0].type).toContain('Creature');
    });

    component.landsRow.subscribe(row => {
      expect(row.length).toBe(1);
      expect(row[0].type).toContain('Land');
    });

    component.allRow.subscribe(row => {
      expect(row.length).toBe(1);
      expect(row[0].type).toContain('Artifact');
    });
  });

  it('should handle destroy action', () => {
    const card = mockPermanents[0];
    component.handleCardAction({ action: 'destroy', card });

    expect(deckServiceMock.moveCardToZone).toHaveBeenCalledWith(card.originalCard, 'battlefield', 'graveyard', 1);
    expect(battlefieldServiceMock.removePermanent).toHaveBeenCalledWith(card.instanceId);
  });

  it('should handle backToHand action', () => {
    const card = mockPermanents[1];
    component.handleCardAction({ action: 'backToHand', card });

    expect(deckServiceMock.moveCardToZone).toHaveBeenCalledWith(card.originalCard, 'battlefield', 'hand', 1);
    expect(battlefieldServiceMock.removePermanent).toHaveBeenCalledWith(card.instanceId);
  });

  it('should handle exile action', () => {
    const card = mockPermanents[2];
    component.handleCardAction({ action: 'exile', card });

    expect(deckServiceMock.moveCardToZone).toHaveBeenCalledWith(card.originalCard, 'battlefield', 'exile', 1);
    expect(battlefieldServiceMock.removePermanent).toHaveBeenCalledWith(card.instanceId);
  });

  it('should handle details action and show modal', () => {
    const card = mockPermanents[1];
    component.handleCardAction({ action: 'details', card });

    expect(component.modalVisible).toBeTrue();
    expect(component.selectedCardForDetails).toBe(card.originalCard);
  });
});
