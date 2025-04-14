import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly deckCardsSubject = new BehaviorSubject<Cart[]>([]);
  private readonly originalDeckSubject = new BehaviorSubject<Cart[]>([]);
  private readonly handZone: Cart[] = [];
  private readonly exileZone: Cart[] = [];
  private readonly graveyardZone: Cart[] = [];
  private readonly handZoneSubject = new BehaviorSubject<Cart[]>(this.handZone);
  private readonly exileZoneSubject = new BehaviorSubject<Cart[]>(this.exileZone);
  private readonly graveyardZoneSubject = new BehaviorSubject<Cart[]>(this.graveyardZone);

  private readonly sideboardSubject = new BehaviorSubject<Cart[]>([]);

  private commander: Cart[] = [];

  setDeckCards(mainDeck: Cart[], sideboard: Cart[]) {
    this.deckCardsSubject.next([...mainDeck]);
    this.originalDeckSubject.next(mainDeck.map(card => ({...card})));

    this.sideboardSubject.next([...sideboard]);

  }

  setCommander(card: Cart) {
    const existingCommander = this.commander.find(commander => commander.id === card.id);

    if (existingCommander) {
      // Si ya es comandante, la eliminamos
      this.commander = this.commander.filter(commander => commander.id !== card.id);
      console.log('Comandante eliminado:', card.name);
    } else {
      // Si no es comandante, la agregamos
      this.commander.push(card);
      console.log('Comandante agregado:', card.name);
    }
    console.log(this.commander)
  }


  getDeckCards() {
    return this.deckCardsSubject.asObservable();
  }

  getOriginalDeckCards() {
    return this.originalDeckSubject.asObservable();
  }

  // Mover una carta a la zona correspondiente (exilio, mano, etc.)
  moveCardToZone(card: Cart, zone: string, quantity: number): void {
    const currentDeck = this.deckCardsSubject.getValue();

    const newDeck = currentDeck.map(deckCard => {
      if (deckCard.id === card.id) {
        const remaining = deckCard.quantity - quantity;
        return remaining > 0 ? { ...deckCard, quantity: remaining } : null;
      }
      return deckCard;
    }).filter((deckCard): deckCard is Cart => deckCard !== null); // Quita los nulls si quantity >= deckCard.quantity

    this.deckCardsSubject.next(newDeck);

    switch (zone) {
      case 'hand':
        this.addCardToZone(this.handZone, this.handZoneSubject, card, quantity);
        break;
      case 'exile':
        this.addCardToZone(this.exileZone, this.exileZoneSubject, card, quantity);
        break;
      case 'graveyard':
        this.addCardToZone(this.graveyardZone, this.graveyardZoneSubject, card, quantity);
        break;
      case 'library': {
        const currentDeck = this.deckCardsSubject.getValue();
        for (let i = 0; i < quantity; i++) {
          currentDeck.push({...card, quantity: 1});
        }
        this.deckCardsSubject.next([...currentDeck]);
        break;
      }
    }

    // Aquí se puede agregar la carta a la zona correspondiente
    console.log(`Carta movida a la zona ${zone}: ${quantity} ${card.name}`);
  }

  private addCardToZone(zoneArray: Cart[], subject: BehaviorSubject<Cart[]>, card: Cart, quantity: number): void {
      for (let i = 0; i < quantity; i++) {
        zoneArray.push({
          ...card,
          quantity: 1,
        });
      }
      subject.next([...zoneArray]);
    }

  // Puedes crear getters para acceder a cada zona
  getHandZone() {
    return this.handZoneSubject.asObservable();
  }

  getExileZone() {
    return this.exileZoneSubject.asObservable();
  }

  getGraveyardZone() {
    return this.graveyardZoneSubject.asObservable();
  }

  // Getter para obtener el comandante
  getCommander(): Cart[] {
    return this.commander;
  }

  getSideboardCards() {
    return this.sideboardSubject.asObservable();
  }

  getDeckCardsMain() {
    return this.deckCardsSubject.getValue(); // Devuelve las cartas del mazo principal
  }

  getDeckCardsSideboard() {
    return this.sideboardSubject.getValue(); // Devuelve las cartas del sideboard
  }
}
