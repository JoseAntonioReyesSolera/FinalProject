import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';
import {BattlefieldService} from './battlefield.service';
import {StackService} from './stack.service';
import {TriggerService} from './trigger.service';
import {LogService} from './log.service';
import {Permanent} from '../models/permanent';
type ZoneName = 'library' | 'hand' | 'graveyard' | 'exile' | 'command' | 'sideboard' | 'battlefield' | 'stack' | 'tokens';
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
    ['tokens', new BehaviorSubject<Cart[]>([])],
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

  setDeckCards(mainDeck: Cart[], sideboard: Cart[], tokens: Cart[]) {
    this.setZone('library', mainDeck);
    this.setZone('sideboard', sideboard);
    this.setZone('tokens', tokens);
  }

  // Mover una carta a la zona correspondiente (exilio, mano, etc.)
  // Mover carta de una zona a otra
  moveCardToZone(card: Cart, to: ZoneName, qty = 1) {
    const from = card.zone;
    if (from === to) return;

    const isLeavingStackOrBattlefield = from !== 'stack' && from !== 'battlefield';
    const battlefield = this.bf.getPermanentsSnapshot();

    if (isLeavingStackOrBattlefield) {
      this.removeFromZone(from as ZoneName, card, qty);
    }

    if (from === 'graveyard' && to !== 'graveyard') {
      this.triggerService.detectTriggers('leaves', battlefield, { source: card, fromZone: 'graveyard' });
    }

    if (to === 'stack' && this.stack.isSplitSecondActive()) {
      this.addToZone(from as ZoneName, card, qty);
      return;
    }

    card.zone = to;
    this.handleCommanderStatus(card, from, to);

    switch (to) {
      case 'stack':
        this.stack.castSpell({ type: 'Spell', source: card, description: `${card.name} cast.` });
        this.triggerService.detectTriggers('cast', battlefield, { source: card });
        break;

      case 'battlefield':
        this.bf.addPermanent(card, qty, from);
        break;

      default:
        this.addToZone(to, card, qty);
    }

    this.handleDrawOrDiscardTriggers(from, to, card, battlefield);

    this.logService.addLog("[DeckService.moveCardToZone]", card.name, ":", from, "-->", to);

    if (card.type_line?.includes('Token') && to !== 'battlefield') {
      this.removeFromZone(to, card, qty);
      this.logService.addLog("[DeckService.moveCardToZone]", `Eliminado token '${card.name}' de la zona ${to}`);
    }
  }

  private handleCommanderStatus(card: Cart, from: string, to: ZoneName) {
    if (to === 'command') {
      card.isCommander = true;
    } else if (from === 'command' && to === 'library') {
      card.isCommander = false;
    }
  }

  private handleDrawOrDiscardTriggers(from: string, to: ZoneName, card: Cart, battlefield: Permanent[]) {
    if (from === 'library' && to === 'hand') {
      this.logService.addLog("[DeckService.drawCard]", card.name);
      this.triggerService.detectTriggers('draw', battlefield, { source: card });
    } else if (from === 'hand' && to === 'graveyard') {
      this.logService.addLog("[DeckService.discardCard]", card.name);
      this.triggerService.detectTriggers('discard', battlefield, { source: card });
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
    tokens: Cart[];
  }) {
    this.setZone('library', state.deck);
    this.setZone('hand', state.hand);
    this.setZone('graveyard', state.graveyard);
    this.setZone('exile', state.exile);
    this.setZone('command', state.commander);
    this.setZone('sideboard', state.sideboard);
    this.setZone('tokens', state.tokens);
  }

  resolveTopStackCard(resolved: boolean) {
    const top = this.stack.resolveTopStackCard();
    if (!top) return;

    if (top.type !== 'Spell') {
      if (resolved && top.onResolve) {
        top.onResolve(resolved);
      }
      return;
    }

    if (!('type_line' in top.source)) return;

    const typeLine = top.source.type_line;
    const isInstantOrSorcery = /Instant|Sorcery/.test(typeLine);

    let destination: ZoneName;

    if (resolved) {
      destination = isInstantOrSorcery ? 'graveyard' : 'battlefield';
    } else {
      destination = 'graveyard';
    }

    this.moveCardToZone(top.source, destination, 1);
  }

  private manaPool: Record<string, number> = {
    white: 0,
    blue: 0,
    black: 0,
    red: 0,
    green: 0,
    colorless: 0,
  };

  getManaPool(): Record<string, number> {
    return this.manaPool;
  }

  addMana(color: string) {
    if (!this.manaPool[color]) this.manaPool[color] = 0;
    this.manaPool[color]++;
  }

  removeMana(color: string) {
    if (this.manaPool[color] > 0) this.manaPool[color]--;
  }

  clearManaPool() {
    Object.keys(this.manaPool).forEach(color => this.manaPool[color] = 0);
  }

}
