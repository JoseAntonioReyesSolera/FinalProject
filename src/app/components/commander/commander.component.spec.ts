import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommanderComponent } from './commander.component';
import { DeckService } from '../../services/deck.service';
import { of } from 'rxjs';
import { Cart } from '../../models/cart';

describe('CommanderComponent', () => {
  let component: CommanderComponent;
  let fixture: ComponentFixture<CommanderComponent>;
  let mockDeckService: jasmine.SpyObj<DeckService>;

  const mockCard: Cart = {
    id: '123',
    name: 'Test Commander',
    oracle_text: '',
    type_line: 'Legendary Creature',
    mana_cost: '{1}{G}',
    cmc: 2,
    quantity: 1,
    currentFaceIndex: 0,
    isSingleImageDoubleFace: false,
    isCommander: true,
    zone: 'command',
    sanitizedManaCost: '',
    sanitizedProducedMana: '',
    sanitizedOracleText: '',
    card_faces: [],
  };

  beforeEach(async () => {
    mockDeckService = jasmine.createSpyObj('DeckService', ['getCommanderZone', 'moveCardToZone', 'setCommander']);
    mockDeckService.getCommanderZone.and.returnValue(of([mockCard]));

    await TestBed.configureTestingModule({
      imports: [CommanderComponent],
      providers: [{ provide: DeckService, useValue: mockDeckService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CommanderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should return commander cards from service', (done) => {
    component.getCommanderCards().subscribe(cards => {
      expect(cards.length).toBe(1);
      expect(cards[0].name).toBe('Test Commander');
      done();
    });
  });

  it('should show context menu on card click', () => {
    const mockEvent = new MouseEvent('click', { clientX: 100, clientY: 200 });
    component.onCardClick(mockEvent, mockCard);
    expect(component.contextMenuVisible).toBeTrue();
    expect(component.contextMenuPosition).toEqual({ x: 100, y: 200 });
    expect(component.selectedCard).toEqual(mockCard);
  });

  it('should call moveCardToZone when casting a spell', () => {
    component.castSpell(mockCard);
    expect(mockDeckService.moveCardToZone).toHaveBeenCalledWith(mockCard, 'command', 'stack', 1);
    expect(component.contextMenuVisible).toBeFalse();
  });

  it('should set selected card for details', () => {
    component.viewDetails(mockCard);
    expect(component.selectedCardForDetails).toEqual(mockCard);
    expect(component.modalVisible).toBeTrue();
    expect(component.contextMenuVisible).toBeFalse();
  });

  it('should move card to hand', () => {
    component.moveToHand(mockCard);
    expect(mockDeckService.moveCardToZone).toHaveBeenCalledWith(mockCard, 'command', 'hand', 1);
    expect(component.contextMenuVisible).toBeFalse();
  });

  it('should unassign commander', () => {
    component.unassignCommander(mockCard);
    expect(mockDeckService.setCommander).toHaveBeenCalledWith(mockCard);
    expect(component.contextMenuVisible).toBeFalse();
  });

  it('should hide context menu if clicked outside', () => {
    const clickEvent = {
      target: document.createElement('div')
    } as unknown as MouseEvent;
    component.contextMenuVisible = true;

    component.onDocumentClick(clickEvent);
    expect(component.contextMenuVisible).toBeFalse();
  });

  it('should not hide context menu if click is on .card or .context-menu', () => {
    ['card', 'context-menu'].forEach(className => {
      const el = document.createElement('div');
      el.classList.add(className);
      const clickEvent = { target: el } as unknown as MouseEvent;

      component.contextMenuVisible = true;
      component.onDocumentClick(clickEvent);
      expect(component.contextMenuVisible).toBeTrue();
    });
  });
});
