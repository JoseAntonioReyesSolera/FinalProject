import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly deckCardsSubject = new BehaviorSubject<Cart[]>([]);
  private readonly originalDeckSubject = new BehaviorSubject<Cart[]>([]);
  private readonly deckCards: Cart[] = [];
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
  moveCardToZone(card: Cart, fromZone: string, toZone: string, quantity: number): void {
    // Remover de la zona de origen
    this.removeCardFromZoneFor(fromZone, card, quantity);
    // Añadir a la zona destino
    this.addCardToZoneFor(toZone, card, quantity);
    // Actualizamos la propiedad si se desea
    console.log(`Carta movida de ${fromZone} a ${toZone}: ${quantity} ${card.name}`);
    card.zone = toZone;
  }

  private addCardToZoneFor(zone: string, card: Cart, quantity: number): void {
    if (zone === 'hand') {
      this.addCardToList(this.handZone, this.handZoneSubject, card, quantity);
    } else if (zone === 'exile') {
      this.addCardToList(this.exileZone, this.exileZoneSubject, card, quantity);
    } else if (zone === 'graveyard') {
      this.addCardToList(this.graveyardZone, this.graveyardZoneSubject, card, quantity);
    } else if (zone === 'library') {
      this.addCardToList(this.deckCardsSubject.getValue(), this.deckCardsSubject, card, quantity);
    }
  }

  private removeCardFromZoneFor(zone: string, card: Cart, quantity: number): void {
    if (zone === 'hand') {
      this.removeCardFromList(this.handZone, this.handZoneSubject, card, quantity);
    } else if (zone === 'exile') {
      this.removeCardFromList(this.exileZone, this.exileZoneSubject, card, quantity);
    } else if (zone === 'graveyard') {
      this.removeCardFromList(this.graveyardZone, this.graveyardZoneSubject, card, quantity);
    } else if (zone === 'library') {
      this.removeCardFromList(this.deckCardsSubject.getValue(), this.deckCardsSubject, card, quantity);
    }
  }

  private addCardToList(
    list: Cart[],
    subject: BehaviorSubject<Cart[]>,
    card: Cart,
    quantity: number
  ): void {
    for (let i = 0; i < quantity; i++) {
      list.push({
        ...card,
        quantity: 1,
      });
    }

    subject.next([...list]);

    // Actualiza también la lista interna si aplica
    if (subject === this.handZoneSubject) this.handZone.splice(0, this.handZone.length, ...list);
    else if (subject === this.exileZoneSubject) this.exileZone.splice(0, this.exileZone.length, ...list);
    else if (subject === this.graveyardZoneSubject) this.graveyardZone.splice(0, this.graveyardZone.length, ...list);
    else if (subject === this.deckCardsSubject) this.deckCards.splice(0, this.deckCards.length, ...list); // si usas una copia interna
  }


  private removeCardFromList(
    list: Cart[],
    subject: BehaviorSubject<Cart[]>,
    card: Cart,
    quantity: number
  ): void {
    let removed = 0;
    const newList = [];
    for (const c of list) {
      if (removed < quantity && c.id === card.id) {
        removed++;
        continue;
      }
      newList.push(c);
    }

    subject.next([...newList]);

    // Actualiza también la lista interna según el subject
    if (subject === this.handZoneSubject) this.handZone.splice(0, this.handZone.length, ...newList);
    else if (subject === this.exileZoneSubject) this.exileZone.splice(0, this.exileZone.length, ...newList);
    else if (subject === this.graveyardZoneSubject) this.graveyardZone.splice(0, this.graveyardZone.length, ...newList);
    else if (subject === this.deckCardsSubject) this.deckCards.splice(0, this.deckCards.length, ...newList); // si mantienes una copia local del mazo
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
