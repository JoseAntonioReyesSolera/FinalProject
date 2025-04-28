import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';
import {BattlefieldService} from './battlefield.service';

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

  constructor(private readonly bf: BattlefieldService) {}

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

    if (toZone === 'battlefield') {
      this.bf.addPermanent(card, quantity);
    }

    console.log(`Carta movida de ${fromZone} a ${toZone}: ${quantity} ${card.name}`);
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
    let zoneName = this.getZoneName(subject);

    for (let i = 0; i < quantity; i++) {
      list.push({
        ...card,
        quantity: 1,
        zone: zoneName,
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
    const newList: Cart[] = [];

    for (const c of list) {
      if (c.id === card.id && quantity > 0) {
        if (c.quantity > quantity) {
          // Hay más de una copia, reducimos la cantidad
          newList.push({
            ...c,
            quantity: c.quantity - quantity,
          });
          quantity = 0; // Ya hemos eliminado la cantidad necesaria
        } else if (c.quantity === quantity) {
          // Eliminamos la carta completa (no la agregamos a newList)
          quantity = 0;
        } else {
          // Se elimina esta carta completa, pero aún falta eliminar más
          quantity -= c.quantity;
          // No se agrega nada
        }
      } else {
        newList.push(c);
      }
    }

    subject.next([...newList]);

    // Actualiza también la lista interna
    if (subject === this.handZoneSubject) this.handZone.splice(0, this.handZone.length, ...newList);
    else if (subject === this.exileZoneSubject) this.exileZone.splice(0, this.exileZone.length, ...newList);
    else if (subject === this.graveyardZoneSubject) this.graveyardZone.splice(0, this.graveyardZone.length, ...newList);
    else if (subject === this.deckCardsSubject) this.deckCards.splice(0, this.deckCards.length, ...newList);
  }

  private getZoneName(subject: BehaviorSubject<Cart[]>): string {
    if (subject === this.handZoneSubject) return 'hand';
    if (subject === this.exileZoneSubject) return 'exile';
    if (subject === this.graveyardZoneSubject) return 'graveyard';
    if (subject === this.deckCardsSubject) return 'library';
    return '';
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
