import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';
import {BattlefieldService} from './battlefield.service';
import {StackService} from './stack.service';

@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly deckCards$ = new BehaviorSubject<Cart[]>([]);
  private readonly original$ = new BehaviorSubject<Cart[]>([]);
  private readonly hand$ = new BehaviorSubject<Cart[]>([]);
  private readonly exile$ = new BehaviorSubject<Cart[]>([]);
  private readonly grave$ = new BehaviorSubject<Cart[]>([]);
  private readonly command$ = new BehaviorSubject<Cart[]>([]);
  private readonly side$ = new BehaviorSubject<Cart[]>([]);

  constructor(private readonly bf: BattlefieldService, private readonly stack: StackService) {
  }

  getDeckCards() {
    return this.deckCards$.asObservable();
  }

  getOriginalDeck() {
    return this.original$.asObservable();
  }

  getHandZone() {
    return this.hand$.asObservable();
  }

  getExileZone() {
    return this.exile$.asObservable();
  }

  getGraveyardZone() {
    return this.grave$.asObservable();
  }

  getCommanderZone() {
    return this.command$.asObservable();
  }

  getSideboardZone() {
    return this.side$.asObservable();
  }

  getDeckCardsMain() {
    return [...this.deckCards$.getValue()];
  }

  getDeckCardsSideboard() {
    return [...this.side$.getValue()];
  }

  getHandZoneSnapshot() {
    return [...this.hand$.getValue()];
  }

  getExileZoneSnapshot() {
    return [...this.exile$.getValue()];
  }

  getGraveyardZoneSnapshot() {
    return [...this.grave$.getValue()];
  }

  getCommanderZoneSnapshot() {
    return [...this.command$.getValue()];
  }

  setDeckCards(mainDeck: Cart[], sideboard: Cart[]) {
    this.deckCards$.next([...mainDeck]);
    this.original$.next(mainDeck.map(c => ({...c})));
    this.side$.next([...sideboard]);

  }

  // Mover una carta a la zona correspondiente (exilio, mano, etc.)
  // Mover carta de una zona a otra
  moveCardToZone(card: Cart, to: 'hand'|'exile'|'graveyard'|'library'|'command'|'sideboard'|'battlefield'|'stack', qty = 1) {
    const from = card.zone as
      | 'hand' | 'exile' | 'graveyard' | 'library' | 'command' | 'sideboard' | 'stack' | 'battlefield';
    // Si la carta es un comandante, cambia su flag `isCommander` a false antes de moverla
    if (from === 'command' && to === 'library') {
      card.isCommander = false;
    }

    // 1) Sacarla de la zona origen (si no es stack o battlefield)
    if (from !== 'stack' && from !== 'battlefield') {
      this.updateZoneList(from, list => this.buildRemovedList(list, card, qty));
    }

    // 2) Actualizar zona del objeto
    card.zone = to;

    // Si la carta es un comandante, cambia su flag `isCommander` a true al ser movida a la zona de comando
    if (to === 'command') {
      card.isCommander = true;
    }

    // 3) Añadir a la zona destino
    if (to === 'stack') {
      this.stack.pushToStack({ type: 'Spell', source: card, description: `${card.name} cast.` });
    } else if (to === 'battlefield') {
      this.bf.addPermanent(card, qty);
    } else {
      this.updateZoneList(to, list => {
        const existing = list.find(c => c.id === card.id);
        if (existing) {
          return list.map(c =>
            c.id === card.id ? { ...c, quantity: c.quantity + qty } : c
          );
        } else {
          return [...list, { ...card, quantity: qty }];
        }
      });
    }
  }

  private updateZoneList(zone: string, mutator: (list: Cart[]) => Cart[]) {
    const subject = this.getSubject(zone);
    const before = subject.getValue();
    const after  = mutator(before);
    subject.next([...after]);
  }

  private getSubject(zone: string) {
    switch(zone) {
      case 'hand':      return this.hand$;
      case 'exile':     return this.exile$;
      case 'graveyard': return this.grave$;
      case 'library':   return this.deckCards$;
      case 'command':   return this.command$;
      case 'sideboard': return this.side$;
      default: throw Error(`Zona inválida: ${zone}`);
    }
  }

  private buildRemovedList(list: Cart[], card: Cart, qty: number): Cart[] {
    const result: Cart[] = [];
    let toRemove = qty;
    for (const c of list) {
      if (c.id === card.id && toRemove > 0) {
        if (c.quantity > toRemove) {
          result.push({ ...c, quantity: c.quantity - toRemove });
          toRemove = 0;
        } else {
          toRemove -= c.quantity;
        }
      } else {
        result.push(c);
      }
    }
    return result;
  }

  setFullGameState(state: {
    deck: Cart[], hand: Cart[], graveyard: Cart[],
    exile: Cart[], commander: Cart[], sideboard: Cart[]
  }) {
    this.deckCards$.next([...state.deck]);
    this.hand$.next([...state.hand]);
    this.grave$.next([...state.graveyard]);
    this.exile$.next([...state.exile]);
    this.command$.next([...state.commander]);
    this.side$.next([...state.sideboard]);
  }

  resolveTopStackCard(resolved: boolean) {
    const top = this.stack.resolveTopStackCard();
    if (!top) return;
    if ('type_line' in top.source) {
      const dest = resolved
        ? (RegExp(/Sorcery|Instant/).exec(top.source.type_line) ? 'graveyard' : 'battlefield')
        : 'graveyard';
      this.moveCardToZone(top.source, dest, 1);
    }
  }
}
