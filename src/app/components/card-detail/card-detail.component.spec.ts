import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardDetailComponent } from './card-detail.component';
import { Cart } from '../../models/cart';

describe('CardDetailComponent', () => {
  let component: CardDetailComponent;
  let fixture: ComponentFixture<CardDetailComponent>;

  const mockCard: Cart = {
    id: 'mock-id',
    name: 'Sample Card',
    oracle_text: 'Some oracle text',
    type_line: 'Creature',
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
    card_faces: [
      {
        name: 'Front Face',
        image_uris: { normal: 'front.jpg' },
        type_line: 'Creature',
        oracle_text: 'Front text',
      },
      {
        name: 'Back Face',
        image_uris: { normal: 'back.jpg' },
        type_line: 'Creature — Nightmare',
        oracle_text: 'Back text',
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardDetailComponent);
    component = fixture.componentInstance;
    component.card = structuredClone(mockCard); // evitamos mutar el original
    component.visible = true;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit closed event when close() is called', () => {
    spyOn(component.closed, 'emit');
    component.close();
    expect(component.closed.emit).toHaveBeenCalled();
  });

  it('should not toggle face if card_faces has less than 2 faces', () => {
    component.card.card_faces = [];
    component.isFrontFaceShown = true;
    component.toggleCardFace();
    expect(component.isFrontFaceShown).toBeTrue(); // no cambio
  });

  it('should toggle card face and update card properties', () => {
    component.isFrontFaceShown = true;
    component.toggleCardFace();

    expect(component.isFrontFaceShown).toBeFalse();
    expect(component.card.name).toBe('Back Face');
    expect(component.card.oracle_text).toBe('Back text');
    expect(component.card.image_uris?.normal).toBe('back.jpg');

    component.toggleCardFace();
    expect(component.isFrontFaceShown).toBeTrue();
    expect(component.card.name).toBe('Front Face');
  });

  it('should not fail if card or visibility is undefined in ngOnChanges', () => {
    component.card = undefined as any;
    expect(() => component.ngOnChanges()).not.toThrow();
  });
});
