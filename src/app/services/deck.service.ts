import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';
import {BattlefieldService} from './battlefield.service';
import {StackService} from './stack.service';
type ZoneName = 'library' | 'hand' | 'graveyard' | 'exile' | 'command' | 'sideboard';
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

  constructor(private readonly bf: BattlefieldService, private readonly stack: StackService) {
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
  moveCardToZone(card: Cart, to: ZoneName | 'battlefield' | 'stack', qty = 1) {
    const from = card.zone;

    if (from !== 'stack' && from !== 'battlefield') {
      this.removeFromZone(from as ZoneName, card, qty);
    }

    card.zone = to;

    if (to === 'command') card.isCommander = true;
    if (from === 'command' && to === 'library') card.isCommander = false;

    if (to === 'stack') {
      this.stack.pushToStack({ type: 'Spell', source: card, description: `${card.name} cast.` });
    } else if (to === 'battlefield') {
      this.bf.addPermanent(card, qty);
    } else {
      this.addToZone(to, card, qty);
    }
    console.log(card.oracle_text, from, to);
    this.detectZoneChangeTriggers(card, from, to);
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

  private detectZoneChangeTriggers(card: Cart, from: string, to: string) {
    const oracle = (card.oracle_text || '').toString();
    const baseName = card.name.split(',')[0].toLowerCase();

    const etbEffect = to === 'battlefield'
      ? this.hasETBAbility(oracle, baseName)
      : null;

    const ltbEffect = from === 'battlefield'
      ? this.hasLeavesTrigger(oracle, baseName)
      : null;

    const dieEffect = from === 'battlefield' && to === 'graveyard'
      ? this.hasDiesTrigger(oracle, baseName)
      : null;

    // ETB = enters the battlefield
    if (etbEffect) {
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: `triggers an ETB ability:`,
        efecto: etbEffect
      });
    }

    // Dies = from battlefield to graveyard
    if (dieEffect) {
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: `triggers dies:`,
        efecto: dieEffect
      });
    }

    // Leaves battlefield = battlefield to any other zone
    if (ltbEffect) {
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: `trigger leaves the battlefield:`,
        efecto: ltbEffect
      });
    }
  }

  private hasETBAbility(oracle: string, cardName: string): string | null {
    const lines = oracle.split('\n');
    const pattern = new RegExp(`^when .* enters`, 'i');
    const match = lines.find(l => pattern.test(l.trim()));
    return match?.trim() || null;
  }

  private hasDiesTrigger(oracle: string, cardName: string): string | null {
    const lines = oracle.split('\n');
    const pattern = new RegExp(`^when .* dies`, 'i');
    const match = lines.find(l => pattern.test(l.trim()));
    return match?.trim() || null;
  }

  private hasLeavesTrigger(oracle: string, cardName: string): string | null {
    const lines = oracle.split('\n');
    const pattern = new RegExp(`^when .* leaves the battlefield`, 'i');
    const match = lines.find(l => pattern.test(l.trim()));
    return match?.trim() || null;
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
