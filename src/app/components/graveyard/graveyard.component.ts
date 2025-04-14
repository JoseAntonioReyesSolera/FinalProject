import {Component, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';
import {FormsModule} from '@angular/forms';
import {ZoneViewerComponent} from '../zone-viewer/zone-viewer.component';

declare const bootstrap: any; // para que reconozca los modales de Bootstrap 5

@Component({
  selector: 'app-graveyard',
  templateUrl: './graveyard.component.html',
  styleUrls: ['./graveyard.component.css'],
  imports: [
    FormsModule,
    ZoneViewerComponent
  ]
})
export class GraveyardComponent implements OnInit {
  graveyardCards: Cart[] = [];
  exileCards: Cart[] = [];
  searchTerm: string = '';
  selectedQuantities: { [cardId: string]: number } = {};

  constructor(private readonly deckService: DeckService) {}

  ngOnInit(): void {
    this.deckService.getGraveyardZone().subscribe(graveyard => {
      this.graveyardCards = graveyard;
    });

    this.deckService.getExileZone().subscribe(exile => {
      this.exileCards = exile;
    });
  }

  filteredGraveyardCards(): Cart[] {
    return this.graveyardCards.filter(card =>
      card.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  moveToZone(card: Cart, zone: 'hand' | 'library' | 'exile' | 'battlefield') {
    const quantity = this.selectedQuantities[card.id] || 1;
    this.deckService.moveCardToZone(card, zone, quantity);
    delete this.selectedQuantities[card.id];
  }

  openModal() {
    const modal = new bootstrap.Modal(document.getElementById('graveyardModal'));
    modal.show();
  }

  get totalGraveyardCards(): number {
    return this.graveyardCards.length;
  }

  filteredExileCards(): Cart[] {
    return this.exileCards.filter(card =>
      card.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  getCardImage(card: Cart): string {
    return card.card_faces && !card.isSingleImageDoubleFace
      ? card.card_faces[card.currentFaceIndex]?.image_uris?.normal
      : card.image_uris?.normal;
  }
}
