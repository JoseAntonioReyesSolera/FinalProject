import { Component } from '@angular/core';
import { ScryfallService } from '../../services/scryfall.service';
import {FormsModule} from '@angular/forms';
import {Cart} from '../../models/cart';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {forkJoin} from 'rxjs';

@Component({
  selector: 'app-hand',
  imports: [
    FormsModule
  ],
  templateUrl: './hand.component.html',
  styleUrl: './hand.component.css'
})
export class HandComponent {
  deckInput: string = '';  // Para almacenar el input del usuario
  deckList: string[] = []; // Para almacenar solo los nombres de las cartas
  deckCards: Cart[] = [];  // Para almacenar las cartas obtenidas de Scryfall
  private readonly manaOrder = ['W', 'U', 'B', 'R', 'G'];

  constructor(private scryfallService: ScryfallService, private sanitizer: DomSanitizer) {}

  processDeckInput() {
    // Dividir el texto en líneas y extraer solo los nombres de las cartas
    this.deckList = this.deckInput
      .split('\n') // Dividir por líneas
      .map(line => line.replace(/^\d+\s*/, '').trim()) // Eliminar cantidad y espacios
      .filter(name => name.length > 0); // Quitar líneas vacías

    // Cargar las cartas en la interfaz
    this.loadDeck();
  }

  private replaceManaSymbolsAndHighlightTriggers(text?: string, keywords: string[] = []): string {
    if (!text) return '';

    text = text.replace(/(Whenever|At|When)([^,]*)(,)([^.]+)(\.)?/g, (match, trigger, rest, comma, after, period) => {
      return `<span class="text-warning fw-bold">${trigger}${rest}${comma}</span><span class="text-success">${after}${period || ''}</span>`;
    });

    text = text.replace(/([A-Za-z\s]+):\s*(.*?)(\.)/g, (match, cost, effect) => {
      return `<span class="text-info fw-bold">${cost}:</span> <span class="text-success">${effect}</span>`;
    });

    keywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      text = text?.replace(keywordRegex, `<span class="text-primary">${keyword}</span>`);
    });

    return text.replace(/\{([^}]+)\}/g, (_, symbol) => {
      return `<img src="https://svgs.scryfall.io/card-symbols/${symbol}.svg"
                 alt="${symbol}"
                 style="width: 20px; height: auto; vertical-align: middle;">`;
    });
  }

  loadDeck() {
    this.deckCards = [];
    const cardRequests = this.deckList.map(name => this.scryfallService.getCardByName(name));

    forkJoin(cardRequests).subscribe({
      next: (cards) => {
        this.deckCards = cards.map(card => ({
          id: card.id,
          name: card.name,
          image_uris: card.image_uris,
          oracle_text: card.oracle_text,
          type_line: card.type_line,
          mana_cost: card.mana_cost,
          cmc: card.cmc,
          power: card.power,
          toughness: card.toughness,
          keywords: card.keywords,
          produced_mana: card.produced_mana,
          sanitizedManaCost: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(card.mana_cost)),
          sanitizedOracleText: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(card.oracle_text, card.keywords)),
          sanitizedProducedMana: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(this.formatProducedMana(card.produced_mana)))
        }));
      },
      error: (err) => console.error('Error al cargar el mazo:', err),
    });
  }

  private formatProducedMana(manaList?: string[]): string {
    if (!manaList) return '';

    // Ordenar según WUBRG
    const sortedMana = manaList.sort((a, b) => this.manaOrder.indexOf(a) - this.manaOrder.indexOf(b));

    // Convertir en formato {MANA}
    return sortedMana.map(mana => `{${mana}}`).join(', ');
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
