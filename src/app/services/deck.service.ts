import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Cart } from '../models/cart';
import {BattlefieldService} from './battlefield.service';
import {StackService} from './stack.service';
import {TriggerService} from './trigger.service';
import {LogService} from './log.service';
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
    const originalFrom = from;

    // No hacer nada si la carta ya está en la zona de destino
    if (from === to) return;

    // Evitar modificar directamente hasta validar tod.o
    if (from !== 'stack' && from !== 'battlefield' && from !== 'tokens') {
      this.removeFromZone(from as ZoneName, card, qty);
    }

    // Split Second evita que se pongan cartas en la pila
    if (to === 'stack' && this.stack.isSplitSecondActive()) {
      this.addToZone(originalFrom as ZoneName, card, qty);
      return;
    }

    // Ahora sí podemos cambiar la zona
    card.zone = to;

    // Control de comandante
    if (to === 'command') {
      card.isCommander = true;
    } else if (from === 'command' && to === 'library') {
      card.isCommander = false;
    }

    // Acción según zona de destino
    if (to === 'stack') {
      const battlefield = this.bf.getPermanentsSnapshot();
      this.stack.castSpell({ type: 'Spell', source: card, description: `${card.name} cast.` });
      this.triggerService.detectTriggers('cast', battlefield, { source: card });
    }
    else if (to === 'battlefield') {
      this.bf.addPermanent(card, qty, from);
    }
    else {
      this.addToZone(to, card, qty);
    }
    if (from === 'library' && to === 'hand') {
      const battlefield = this.bf.getPermanentsSnapshot();
      this.logService.addLog("[DeckService.drawCard]", card.name);
      this.triggerService.detectTriggers('draw', battlefield, { source: card });
    }

    if (from === 'hand' && to === 'graveyard') {
      const battlefield = this.bf.getPermanentsSnapshot();
      this.logService.addLog("[DeckService.discardCard]", card.name);
      this.triggerService.detectTriggers('discard', battlefield, { source: card });
    }

    // Registrar log y disparar triggers si hay cambio de zona
    this.logService.addLog("[DeckService.moveCardToZone]", card.name, ":", from, "-->", to);

    if (card.type_line?.includes('Token') && to !== 'battlefield') {
      this.removeFromZone(to, card, qty);
      this.logService.addLog("[DeckService.moveCardToZone]", `Eliminado token '${card.name}' de la zona ${to}`);
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
