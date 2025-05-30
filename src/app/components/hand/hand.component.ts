import {Component, HostListener, OnInit} from '@angular/core';
import {Cart} from '../../models/cart';
import {DeckService} from '../../services/deck.service';
import {CardDetailComponent} from '../card-detail/card-detail.component';

@Component({
  selector: 'app-hand',
  imports: [
    CardDetailComponent
  ],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.css'
})
export class HandComponent implements OnInit {
  handCards: Cart[] = [];
  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedCard: any = null;
  selectedCardForDetails: Cart | null = null;
  modalVisible = false;

  constructor(private readonly deckService: DeckService) {}

  ngOnInit() {
    // Suscripción para recibir cambios en la zona de la mano
    this.deckService.getZoneObservable('hand').subscribe(hand => {
      this.handCards = hand;
    });
  }

  onCardClick(event: MouseEvent, card: any) {
    event.preventDefault(); // Evita el menú del navegador
    this.contextMenuPosition = { x: event.clientX, y: event.clientY-170 };
    this.selectedCard = card;
    this.contextMenuVisible = true;
  }

  castSpell(card: any) {
    this.contextMenuVisible = false;
    if(card.type_line.includes("Land")) {
      this.deckService.moveCardToZone(card, 'battlefield', 1);
    } else {
      this.deckService.moveCardToZone(card, 'stack', 1);
    }
  }

  viewDetails(card: any) {
    this.contextMenuVisible = false;
    this.contextMenuVisible = false;
    this.selectedCardForDetails = card;
    this.modalVisible = true;
  }

  moveToLibrary(card: any) {
    this.contextMenuVisible = false;
    this.deckService.moveCardToZone(card, 'library', 1);
  }

  moveToGraveyard(card: any) {
    this.contextMenuVisible = false;
    this.deckService.moveCardToZone(card, 'graveyard', 1);
  }

  moveToExile(card: any) {
    this.contextMenuVisible = false;
    this.deckService.moveCardToZone(card, 'exile', 1);
  }

  getCopies(quantity: number): number[] {
    return Array.from({ length: quantity }, (_, i) => i);
  }

  canCast(card: Cart): boolean {
    if (!card.mana_cost) return false;

    const manaPool = { ...this.deckService.getManaPool() };
    const symbols = this.extractManaSymbols(card.mana_cost);

    return this.tryPayManaCost(symbols, manaPool);
  }

  private tryPayManaCost(symbols: string[], pool: Record<string, number>): boolean {
    if (symbols.length === 0) return true;

    const [symbol, ...rest] = symbols;

    const handlers: ((s: string, p: Record<string, number>, r: string[]) => boolean | null)[] = [
      this.handleGenericCost.bind(this),
      this.handleHybridTwo.bind(this),
      this.handlePhyrexian.bind(this),
      this.handleHybrid.bind(this),
      this.handleSpecific.bind(this)
    ];

    for (const handler of handlers) {
      const result = handler(symbol, pool, rest);
      if (result !== null) return result;
    }

    return false;
  }

  private handleGenericCost(symbol: string, pool: Record<string, number>, rest: string[]): boolean | null {
    if (!/^\d+$/.test(symbol)) return null;

    let genericCost = parseInt(symbol, 10);
    const totalAvailable = Object.values(pool).reduce((a, b) => a + b, 0);
    if (totalAvailable < genericCost) return false;

    const poolCopy = { ...pool };
    for (const color of Object.keys(poolCopy)) {
      const used = Math.min(poolCopy[color], genericCost);
      poolCopy[color] -= used;
      genericCost -= used;
      if (genericCost === 0) break;
    }

    return this.tryPayManaCost(rest, poolCopy);
  }

  private handleHybridTwo(symbol: string, pool: Record<string, number>, rest: string[]): boolean | null {
    if (!/^2\/[WUBRG]$/.test(symbol)) return null;

    const color = this.symbolToColor(symbol.split('/')[1]);

    // Option A: pay with the color
    if (color && pool[color] > 0) {
      const poolCopy = { ...pool };
      poolCopy[color]--;
      if (this.tryPayManaCost(rest, poolCopy)) return true;
    }

    // Option B: pay 2 generic
    let genericLeft = 2;
    const totalAvailable = Object.values(pool).reduce((a, b) => a + b, 0);
    if (totalAvailable < 2) return false;

    const poolCopy = { ...pool };
    for (const c of Object.keys(poolCopy)) {
      const used = Math.min(poolCopy[c], genericLeft);
      poolCopy[c] -= used;
      genericLeft -= used;
      if (genericLeft === 0) break;
    }

    return genericLeft === 0 && this.tryPayManaCost(rest, poolCopy);
  }

  private handlePhyrexian(symbol: string, pool: Record<string, number>, rest: string[]): boolean | null {
    if (!symbol.endsWith('/P')) return null;

    const color = this.symbolToColor(symbol.split('/')[0]);
    if (color && pool[color] > 0) {
      const poolCopy = { ...pool };
      poolCopy[color]--;
      return this.tryPayManaCost(rest, poolCopy);
    }

    return false;
  }

  private handleHybrid(symbol: string, pool: Record<string, number>, rest: string[]): boolean | null {
    if (!symbol.includes('/') || symbol.endsWith('/P') || symbol.startsWith('2/')) return null;

    const [optA, optB] = symbol.split('/');
    const options = [optA, optB].map(this.symbolToColor).filter(Boolean) as string[];

    for (const color of options) {
      if (pool[color] > 0) {
        const poolCopy = { ...pool };
        poolCopy[color]--;
        if (this.tryPayManaCost(rest, poolCopy)) return true;
      }
    }

    return false;
  }

  private handleSpecific(symbol: string, pool: Record<string, number>, rest: string[]): boolean | null {
    const color = this.symbolToColor(symbol);
    if (color && pool[color] > 0) {
      const poolCopy = { ...pool };
      poolCopy[color]--;
      return this.tryPayManaCost(rest, poolCopy);
    }

    return false;
  }



  private extractManaSymbols(manaCost: string): string[] {
    const matches = manaCost.match(/\{([^}]+)}/g);
    return matches ? matches.map(s => s.replace(/[{}]/g, '')) : [];
  }

  private symbolToColor(symbol: string): string | null {
    const map: Record<string, string> = {
      W: 'white',
      U: 'blue',
      B: 'black',
      R: 'red',
      G: 'green',
      C: 'colorless'
    };
    return map[symbol] || null;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu') && !target.closest('.card-item')) {
      this.contextMenuVisible = false;
    }
  }
}
