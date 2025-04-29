import {Component, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';

@Component({
  selector: 'app-hand',
  imports: [
  ],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.css'
})
export class HandComponent implements OnInit {
  handCards: Cart[] = [];
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedCard: any = null;

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
    alert(`Detalles de ${card.name}`);
  }

  moveToExile(card: any) {
    this.contextMenuVisible = false;
    console.log('Exiliando carta:', card.name);
  }
}
