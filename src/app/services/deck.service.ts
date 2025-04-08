import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly deckCardsSubject = new BehaviorSubject<Cart[]>([]);
  private readonly originalDeckSubject = new BehaviorSubject<Cart[]>([]);

  setDeckCards(deckCards: Cart[]) {
    this.deckCardsSubject.next(deckCards);
    this.originalDeckSubject.next(deckCards.map(card => ({ ...card }))); // guarda copia original
  }

  getDeckCards() {
    return this.deckCardsSubject.asObservable();
  }

  getOriginalDeckCards() {
    return this.originalDeckSubject.asObservable();
  }

  drawCard(card: Cart) {
    const currentDeck = this.deckCardsSubject.getValue();
    const newDeck = currentDeck.filter(deckCard => deckCard.id !== card.id);
    this.deckCardsSubject.next(newDeck);

    console.log(`Carta robada: ${card.name}`);
  }

  // Función para exiliar cartas
  exileCard(card: Cart) {
    const currentDeck = this.deckCardsSubject.getValue();
    const newDeck = currentDeck.filter(deckCard => deckCard.id !== card.id);
    this.deckCardsSubject.next(newDeck);

    console.log(`Carta exiliada: ${card.name}`);
  }

  // Función para moler cartas (eliminar del mazo)
  millCard(card: Cart) {
    const currentDeck = this.deckCardsSubject.getValue();
    const newDeck = currentDeck.filter(deckCard => deckCard.id !== card.id);
    this.deckCardsSubject.next(newDeck);

    console.log(`Carta molida: ${card.name}`);
  }

  // Mover una carta a la zona correspondiente (exilio, mano, etc.)
  moveCardToZone(card: Cart, zone: string): void {
    const currentDeck = this.deckCardsSubject.getValue();
    const newDeck = currentDeck.filter(deckCard => deckCard.id !== card.id);

    // Actualizar el mazo
    this.deckCardsSubject.next(newDeck);

    // Aquí se puede agregar la carta a la zona correspondiente
    console.log(`Carta movida a la zona ${zone}: ${card.name}`);
  }

}
