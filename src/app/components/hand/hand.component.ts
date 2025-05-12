import {Component, HostListener, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';
import {CardDetailComponent} from '../card-detail/card-detail.component';

@Component({
  selector: 'app-hand',
  imports: [
    CardDetailComponent
  ],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.css'
})
export class HandComponent implements OnInit {
  handCards: Cart[] = [];
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedCard: any = null;
  selectedCardForDetails: Cart | null = null;
  modalVisible = false;

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    // Suscripción para recibir cambios en la zona de la mano
    this.deckService.getHandZone().subscribe(hand => {
      this.handCards = hand;
    });
  }

  onCardClick(event: MouseEvent, card: any) {
    event.preventDefault(); // Evita el menú del navegador
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.selectedCard = card;
    this.contextMenuVisible = true;
  }

  castSpell(card: any) {
    this.contextMenuVisible = false;
    if(card.type_line.includes("Land")) {
      this.deckService.moveCardToZone(card, 'battlefield', 1);
    } else {
      this.deckService.moveCardToZone(card, 'stack', 1);
    }
  }

  viewDetails(card: any) {
    this.contextMenuVisible = false;
    this.contextMenuVisible = false;
    this.selectedCardForDetails = card;
    this.modalVisible = true;
  }

  moveToLibrary(card: any) {
    this.contextMenuVisible = false;
    this.deckService.moveCardToZone(card, 'library', 1);
  }

  moveToGraveyard(card: any) {
    this.contextMenuVisible = false;
    this.deckService.moveCardToZone(card, 'graveyard', 1);
  }

  moveToExile(card: any) {
    this.contextMenuVisible = false;
    this.deckService.moveCardToZone(card, 'exile', 1);
  }

  getCopies(quantity: number): number[] {
    return Array.from({ length: quantity }, (_, i) => i);
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu') && !target.closest('.card-item')) {
      this.contextMenuVisible = false;
    }
  }
}
