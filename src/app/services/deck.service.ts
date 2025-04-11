import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly deckCardsSubject = new BehaviorSubject<Cart[]>([]);
  private readonly originalDeckSubject = new BehaviorSubject<Cart[]>([]);
  private handZone: Cart[] = [];
  private exileZone: Cart[] = [];
  private graveyardZone: Cart[] = [];
  private handZoneSubject = new BehaviorSubject<Cart[]>(this.handZone);

  private sideboard: Cart[] = [];
  private readonly sideboardSubject = new BehaviorSubject<Cart[]>([]);

  private commander: Cart | null = null;

  setDeckCards(deckCards: Cart[]) {
    const [mainDeck, sideboard] = this.splitDeckAndSideboard(deckCards);
    this.deckCardsSubject.next(deckCards);
    this.originalDeckSubject.next(deckCards.map(card => ({ ...card }))); // guarda copia original

    this.sideboard = sideboard;
    this.sideboardSubject.next([...sideboard]);

    if (mainDeck.length >= 100) {
      this.setCommander(mainDeck); // Si hay 100 o más cartas, asignar el comandante
    }

    console.log('Sideboard:', sideboard); // Ver las cartas del sideboard si las necesitas
  }

  private splitDeckAndSideboard(deckCards: Cart[]): [Cart[], Cart[]] {
    const sideboardIndex = deckCards.findIndex(card => card.name === 'SIDEBOARD:');
    const mainDeck = sideboardIndex === -1 ? deckCards : deckCards.slice(0, sideboardIndex);
    const sideboard = sideboardIndex === -1 ? [] : deckCards.slice(sideboardIndex + 1);

    return [mainDeck, sideboard];
  }

  private setCommander(mainDeck: Cart[]) {
    this.commander = mainDeck[mainDeck.length - 1];
    if (this.commander) {
      this.commander.isCommander = true; // Activar isCommander
    }
    console.log('Comandante asignado:', this.commander);
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

    if (zone === 'draw') {
      this.addCardToZone(this.handZone, card, quantity);
    } else if (zone === 'exile') {
      this.addCardToZone(this.exileZone, card, quantity);
    } else if (zone === 'graveyard') {
      this.addCardToZone(this.graveyardZone, card, quantity);
    }

    // Aquí se puede agregar la carta a la zona correspondiente
    console.log(`Carta movida a la zona ${zone}: ${quantity} ${card.name}`);
  }

  private addCardToZone(zone: Cart[], card: Cart, quantity: number): void {
    const existingCard = zone.find(c => c.name === card.name);
    if (existingCard) {
      existingCard.quantity += quantity; // Sumar la cantidad si ya está en la zona
    } else {
      zone.push({ ...card, quantity }); // Si no, agregar la carta
    }

    this.updateZoneSubject(zone);
  }

  private updateZoneSubject(zone: Cart[]): void {
    if (zone === this.handZone) {
      this.handZoneSubject.next([...zone]); // Actualizar la zona de la mano
    }

    if (zone === this.exileZone) {
      this.deckCardsSubject.next([...this.exileZone]); // Actualizar la zona del exilio
    }

    if (zone === this.graveyardZone) {
      this.deckCardsSubject.next([...this.graveyardZone]); // Actualizar la zona del cementerio
    }
  }

  // Puedes crear getters para acceder a cada zona
  getHandZone() {
    return this.handZoneSubject.asObservable();
  }

  getExileZone() {
    return new BehaviorSubject<Cart[]>(this.exileZone).asObservable();
  }

  getGraveyardZone() {
    return new BehaviorSubject<Cart[]>(this.graveyardZone).asObservable();
  }

  // Getter para obtener el comandante
  getCommander(): Cart | null {
    return this.commander;
  }

  getSideboardCards() {
    return this.sideboardSubject.asObservable();
  }
}
