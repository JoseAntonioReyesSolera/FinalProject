import {Component, EventEmitter, Input, Output} from '@angular/core';
import { Cart } from '../../models/cart';
import { DeckService } from '../../services/deck.service';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-zone-viewer',
  templateUrl: './zone-viewer.component.html',
  styleUrls: ['./zone-viewer.component.css'],
  imports: [
    FormsModule
  ],
  standalone: true
})
export class ZoneViewerComponent {
  @Input() zoneName: string = '';
  @Input() zoneType: 'library' | 'graveyard' | 'exile' | 'battlefield' | 'hand' | 'sideboard' = 'library';
  @Input() cards: Cart[] = [];

  @Output() action = new EventEmitter<{ card: Cart, zone: string, quantity: number }>();

  searchTerm: string = '';
  selectedQuantities: { [cardId: string]: number } = {};

  constructor(private readonly deckService: DeckService) {}

  filteredCards(): Cart[] {
    return this.cards.filter(card =>
      card.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  moveToZone(card: Cart, zone: 'hand' | 'library' | 'exile' | 'battlefield' | 'graveyard') {
    const quantity = this.selectedQuantities[card.id] || 1;
    this.deckService.moveCardToZone(card, zone, quantity);
    delete this.selectedQuantities[card.id];
  }

  getCardImage(card: Cart): string {
    return card.card_faces && !card.isSingleImageDoubleFace
      ? card.card_faces[card.currentFaceIndex]?.image_uris?.normal
      : card.image_uris?.normal;
  }

  isLibrary(): boolean {
    return this.zoneType === 'library';
  }

  isGraveyard(): boolean {
    return this.zoneType === 'graveyard';
  }

  isExile(): boolean {
    return this.zoneType === 'exile';
  }

  setAsCommander(card: any) {
    if (card.isCommander) {
      // Si es comandante, quitarla como comandante
      card.isCommander = false;
      console.log('Carta retirada de comandante:', card.name);
    } else {
      // Si no es comandante, marcarla como comandante
      card.isCommander = true;
      console.log('Carta marcada como comandante:', card.name);
    }

    // Actualizar el comandante en el servicio
    this.deckService.setCommander(card);
  }
}
