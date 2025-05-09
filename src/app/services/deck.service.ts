import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';
import {BattlefieldService} from './battlefield.service';
import {StackService} from './stack.service';

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
  private readonly commanderZone: Cart[] = [];
  private readonly sideboardZone: Cart[] = [];
  private readonly commanderZoneSubject = new BehaviorSubject<Cart[]>(this.commanderZone);
  private readonly handZoneSubject = new BehaviorSubject<Cart[]>(this.handZone);
  private readonly exileZoneSubject = new BehaviorSubject<Cart[]>(this.exileZone);
  private readonly graveyardZoneSubject = new BehaviorSubject<Cart[]>(this.graveyardZone);
  private readonly sideboardSubject = new BehaviorSubject<Cart[]>(this.sideboardZone);

  private readonly zoneMap = new Map<string, { list: Cart[]; subject: BehaviorSubject<Cart[]> }>([
    ['hand', { list: this.handZone, subject: this.handZoneSubject }],
    ['exile', { list: this.exileZone, subject: this.exileZoneSubject }],
    ['graveyard', { list: this.graveyardZone, subject: this.graveyardZoneSubject }],
    ['library', { list: this.deckCards, subject: this.deckCardsSubject }],
    ['command', { list: this.commanderZone, subject: this.commanderZoneSubject }],
    ['sideboard', { list: this.sideboardZone, subject: this.sideboardSubject }],
  ]);


  constructor(private readonly bf: BattlefieldService, private readonly stack: StackService) {}

  setDeckCards(mainDeck: Cart[], sideboard: Cart[]) {
    this.deckCardsSubject.next([...mainDeck]);
    this.originalDeckSubject.next(mainDeck.map(card => ({...card})));

    this.sideboardZone.splice(0, this.sideboardZone.length, ...sideboard);
    this.sideboardSubject.next([...sideboard]);

  }

  setCommander(card: Cart) {
    const isCommander = this.commanderZone.find(c => c.id === card.id);

    if (isCommander) {
      card.isCommander = false;
      this.moveCardToZone(card, 'command', 'library', 1);
    } else {
      this.moveCardToZone(card, card.zone, 'command', 1);
    }
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

    if (toZone === 'stack') {
      this.stack.pushToStack({
        type: 'Spell',
        source: card,
        description: `${card.name} is being cast.`,
      });
    } else if (toZone === 'battlefield') {
      this.bf.addPermanent(card, quantity);
    }

  }

  private addCardToZoneFor(zone: string, card: Cart, quantity: number): void {
    const target = this.zoneMap.get(zone);
    if (!target) return;

    this.addCardToList(target.list, target.subject, card, quantity);
  }

  private removeCardFromZoneFor(zone: string, card: Cart, quantity: number): void {
    const target = this.zoneMap.get(zone);
    if (!target) return;

    this.removeCardFromList(target.list, target.subject, card, quantity);

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
    else if (subject === this.deckCardsSubject) this.deckCards.splice(0, this.deckCards.length, ...list);
    else if (subject === this.commanderZoneSubject) this.commanderZone.splice(0, this.commanderZone.length, ...list);
  }


  private removeCardFromList(
    list: Cart[],
    subject: BehaviorSubject<Cart[]>,
    card: Cart,
    quantity: number
  ): void {
    const newList = this.buildUpdatedList(list, card, quantity);
    subject.next([...newList]);
    this.updateInternalList(subject, newList);
  }

  private buildUpdatedList(list: Cart[], card: Cart, quantity: number): Cart[] {
    const newList: Cart[] = [];
    let remaining = quantity;

    for (const c of list) {
      if (c.id === card.id && remaining > 0) {
        if (c.quantity > remaining) {
          newList.push({ ...c, quantity: c.quantity - remaining });
          remaining = 0;
        } else {
          remaining -= c.quantity; // Se elimina toda esta carta
        }
      } else {
        newList.push(c);
      }
    }

    return newList;
  }

  private updateInternalList(subject: BehaviorSubject<Cart[]>, newList: Cart[]): void {
    if (subject === this.handZoneSubject) {
      this.handZone.splice(0, this.handZone.length, ...newList);
    } else if (subject === this.exileZoneSubject) {
      this.exileZone.splice(0, this.exileZone.length, ...newList);
    } else if (subject === this.graveyardZoneSubject) {
      this.graveyardZone.splice(0, this.graveyardZone.length, ...newList);
    } else if (subject === this.deckCardsSubject) {
      this.deckCards.splice(0, this.deckCards.length, ...newList);
    } else if (subject === this.commanderZoneSubject) {
      this.commanderZone.splice(0, this.commanderZone.length, ...newList);
    } else if (subject === this.sideboardSubject) {
      this.sideboardZone.splice(0, this.sideboardZone.length, ...newList);
    }
  }

  resolveTopStackCard(resolved:boolean): void {
    const topItem = this.stack.resolveTopStackCard();
    if (!topItem) return;

    let destination = 'graveyard';
    const card = topItem.source;
    if ('type_line' in card) {
      if (resolved) {
        destination = (card.type_line.includes('Sorcery') || card.type_line.includes('Instant'))
          ? destination : 'battlefield';
      }
      this.moveCardToZone(card, 'stack', destination, 1);
    }
  }

  private getZoneName(subject: BehaviorSubject<Cart[]>): string {
    if (subject === this.handZoneSubject) return 'hand';
    if (subject === this.exileZoneSubject) return 'exile';
    if (subject === this.graveyardZoneSubject) return 'graveyard';
    if (subject === this.deckCardsSubject) return 'library';
    if (subject === this.commanderZoneSubject) return 'command';
    if (subject === this.sideboardSubject) return 'sideboard';
    return '';
  }

  setFullGameState(state: {
    deck: Cart[],
    hand: Cart[],
    graveyard: Cart[],
    exile: Cart[],
    commander: Cart[],
    sideboard: Cart[]
  }) {
    this.deckCards.splice(0, this.deckCards.length, ...state.deck);
    this.handZone.splice(0, this.handZone.length, ...state.hand);
    this.graveyardZone.splice(0, this.graveyardZone.length, ...state.graveyard);
    this.exileZone.splice(0, this.exileZone.length, ...state.exile);
    this.commanderZone.splice(0, this.commanderZone.length, ...state.commander);
    this.sideboardZone.splice(0, this.sideboardZone.length, ...state.sideboard);

    this.deckCardsSubject.next([...state.deck]);
    this.handZoneSubject.next([...state.hand]);
    this.graveyardZoneSubject.next([...state.graveyard]);
    this.exileZoneSubject.next([...state.exile]);
    this.commanderZoneSubject.next([...state.commander]);
    this.sideboardSubject.next([...state.sideboard]);
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
  getCommanderZone() {
    return this.commanderZoneSubject.asObservable();
  }

  getSideboardCards() {
    return this.sideboardSubject.asObservable();
  }

  getHandZoneSnapshot(): Cart[] {
    return [...this.handZone];
  }

  getGraveyardZoneSnapshot(): Cart[] {
    return [...this.graveyardZone];
  }

  getExileZoneSnapshot(): Cart[] {
    return [...this.exileZone];
  }

  getCommanderZoneSnapshot(): Cart[] {
    return [...this.commanderZone];
  }

  getDeckCardsMain(): Cart[] {
    return [...this.deckCards];
  }

  getDeckCardsSideboard(): Cart[] {
    return [...this.sideboardZone];
  }
}
