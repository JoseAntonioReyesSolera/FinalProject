import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';
import {BattlefieldService} from './battlefield.service';
import {StackService} from './stack.service';
import {TriggerService} from './trigger.service';
import {LogService} from './log.service';
type ZoneName = 'library' | 'hand' | 'graveyard' | 'exile' | 'command' | 'sideboard' | 'battlefield' | 'stack';
@Injectable({
  providedIn: 'root'
})
export class DeckService {
  private readonly zones: Map<ZoneName, BehaviorSubject<Cart[]>> = new Map([
    ['library',   new BehaviorSubject<Cart[]>([])],
    ['hand',      new BehaviorSubject<Cart[]>([])],
    ['graveyard', new BehaviorSubject<Cart[]>([])],
    ['exile',     new BehaviorSubject<Cart[]>([])],
    ['command',   new BehaviorSubject<Cart[]>([])],
    ['sideboard', new BehaviorSubject<Cart[]>([])],
  ]);

  constructor(private readonly bf: BattlefieldService, private readonly stack: StackService, private readonly triggerService: TriggerService, private readonly logService: LogService) {
  }

  getZone(zone: ZoneName): Cart[] {
    return [...this.zones.get(zone)!.getValue()];
  }

  getZoneObservable(zone: ZoneName) {
    return this.zones.get(zone)!.asObservable();
  }


  setZone(zone: ZoneName, cards: Cart[]) {
    this.zones.get(zone)!.next([...cards]);
  }

  setDeckCards(mainDeck: Cart[], sideboard: Cart[]) {
    this.setZone('library', mainDeck);
    this.setZone('sideboard', sideboard);
  }

  // Mover una carta a la zona correspondiente (exilio, mano, etc.)
  // Mover carta de una zona a otra
  moveCardToZone(card: Cart, to: ZoneName, qty = 1) {
    const from = card.zone;
    const originalFrom = from;

    if (from !== 'stack' && from !== 'battlefield') {
      this.removeFromZone(from as ZoneName, card, qty);
    }

    card.zone = to;

    if (to === 'command') card.isCommander = true;
    if (from === 'command' && to === 'library') card.isCommander = false;

    if (to === 'stack' && !this.stack.isSplitSecondActive()) {
      const battlefield = this.bf.getPermanentsSnapshot();
      this.stack.castSpell({ type: 'Spell', source: card, description: `${card.name} cast.` });
      this.triggerService.detectCastTriggers(card, battlefield);
    }
    else if (to === 'stack' && this.stack.isSplitSecondActive()) {
      card.zone = originalFrom as ZoneName;
      this.addToZone(originalFrom as ZoneName, card, card.quantity);
    }
    else if (to === 'battlefield') {
      this.bf.addPermanent(card, qty, from);
    } else {
      this.addToZone(to, card, qty);
    }
    this.logService.addLog("[DeckService.moveCardToZone] ", card.name, ": ", from,"-->", to);
    if (from !== to) {
      this.triggerService.detectZoneChangeTriggers(card, from, to);
      const battlefield = this.bf.getPermanentsSnapshot();
      this.triggerService.detectCastTriggers(card, battlefield);
    }
  }

  private addToZone(zone: ZoneName, card: Cart, qty: number) {
    const list = this.getZone(zone);
    const existing = list.find(c => c.id === card.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      list.push({ ...card, quantity: qty });
    }
    this.setZone(zone, list);
  }

  private removeFromZone(zone: ZoneName, card: Cart, qty: number) {
    const list = this.getZone(zone);
    const updated = this.removeQuantity(list, card, qty);
    this.setZone(zone, updated);
  }

  private removeQuantity(list: Cart[], card: Cart, qty: number): Cart[] {
    const result: Cart[] = [];
    let toRemove = qty;
    for (const c of list) {
      if (c.id === card.id && toRemove > 0) {
        if (c.quantity > toRemove) {
          result.push({ ...c, quantity: c.quantity - toRemove });
          toRemove = 0;
        } // else skip
        else {
          toRemove -= c.quantity;
        }
      } else {
        result.push(c);
      }
    }
    return result;
  }

  setFullGameState(state: {
    deck: Cart[];
    hand: Cart[];
    graveyard: Cart[];
    exile: Cart[];
    commander: Cart[];
    sideboard: Cart[];
  }) {
    this.setZone('library', state.deck);
    this.setZone('hand', state.hand);
    this.setZone('graveyard', state.graveyard);
    this.setZone('exile', state.exile);
    this.setZone('command', state.commander);
    this.setZone('sideboard', state.sideboard);
  }

  resolveTopStackCard(resolved: boolean) {
    const top = this.stack.resolveTopStackCard();
    if (!top) return;

    if (top.type !== 'Spell') {
      // Si no es un hechizo, no hacemos nada más.
      return;
    }

    if (!('type_line' in top.source)) return;

    const typeLine = top.source.type_line;
    const isInstantOrSorcery = /Instant|Sorcery/.test(typeLine);

    const destination = resolved
      ? (isInstantOrSorcery ? 'graveyard' : 'battlefield')
      : 'graveyard';

    this.moveCardToZone(top.source, destination, 1);
  }
}
