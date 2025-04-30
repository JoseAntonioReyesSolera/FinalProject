import {Component, OnInit} from '@angular/core';
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
    console.log('Lanzando hechizo:', card.name);
    // Aquí agregarías la lógica para moverlo al stack
  }

  viewDetails(card: any) {
    this.contextMenuVisible = false;
    this.contextMenuVisible = false;
    this.selectedCardForDetails = card;
    this.modalVisible = true;
  }

  moveToLibrary(card: any) {
    this.contextMenuVisible = false;
    console.log('Carta biblioteca carta:', card.name);
    this.deckService.moveCardToZone(card, 'hand', 'library', 1);
  }

  moveToGraveyard(card: any) {
    this.contextMenuVisible = false;
    console.log('Descartando carta:', card.name);
    this.deckService.moveCardToZone(card, 'hand', 'graveyard', 1);
  }

  moveToExile(card: any) {
    this.contextMenuVisible = false;
    console.log('Exiliando carta:', card.name);
    this.deckService.moveCardToZone(card, 'hand', 'exile', 1);
  }
}
