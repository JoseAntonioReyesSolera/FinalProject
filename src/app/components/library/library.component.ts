import {Component} from '@angular/core';
import {DeckService} from '../../services/deck.service';
import {Cart} from '../../models/cart';
import * as bootstrap from 'bootstrap';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-library',
  imports: [
    FormsModule
  ],
  templateUrl: './library.component.html',
  styleUrl: './library.component.css'
})
export class LibraryComponent {
  public totalDeckCards: number = 0;
  public deckCards: Cart[] = [];
  public showContextMenu = false;
  public contextMenuPosition = { x: 0, y: 0 };
  selectedCards: any[] = [];  // Las cartas seleccionadas por el usuario
  searchTerm: string = '';
  selectedQuantities: { [cardId: string]: number } = {};

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    this.deckService.getDeckCards().subscribe(cards => {
      this.deckCards = cards;
      this.totalDeckCards = cards.reduce((sum, card) => sum + (card.quantity || 1), 0);
    });
  }

  onRightClick(event: MouseEvent) {
    event.preventDefault();
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.showContextMenu = true;
    const modalElement = document.getElementById('cardListModal');
    if (modalElement) {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Seleccionar una carta
  selectCard(card: any) {
    const index = this.selectedCards.indexOf(card);
    if (index > -1) {
      this.selectedCards.splice(index, 1);
    } else {
      this.selectedCards.push(card);
      if (!this.selectedQuantities[card.id]) {
        this.selectedQuantities[card.id] = 1;
      }
    }
  }

  performActionOnSelectedCards(action: 'draw' | 'exile' | 'mill' | 'battlefield') {
    this.selectedCards.forEach(card => {
      const quantity = this.selectedQuantities[card.id] || 1;
      this.deckService.moveCardToZone(card, action, quantity);
      delete this.selectedQuantities[card.id];
    });

    this.selectedCards = [];
    this.selectedQuantities = {};
  }

  get filteredDeckCards(): Cart[] {
    if (!this.searchTerm) {
      return this.deckCards;
    }
    return this.deckCards.filter(card =>
      card.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }
}
