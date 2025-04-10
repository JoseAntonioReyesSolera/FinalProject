import { Component } from '@angular/core';
import {Cart} from '../../models/cart';
import {ScryfallService} from '../../services/scryfall.service';
import { DeckService } from '../../services/deck.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {forkJoin} from 'rxjs';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-deck-processor',
  imports: [FormsModule],
  templateUrl: './deck-processor.component.html',
  styleUrl: './deck-processor.component.css'
})
export class DeckProcessorComponent {
  deckInput: string = '';
  deckList: { name: string, quantity: number }[] = [];
  deckCards: Cart[] = [];
  private readonly manaOrder = ['W', 'U', 'B', 'R', 'G'];

  constructor(
              private readonly scryfallService: ScryfallService,
              private readonly sanitizer: DomSanitizer,
              private readonly deckService: DeckService,
    ) {}

  processDeckInput() {
    this.deckList = this.deckInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const match = RegExp(/^(\d+)\s+(.+)$/).exec(line);
        return match ? { quantity: parseInt(match[1], 10), name: match[2] } : { quantity: 1, name: line };
      });

    this.loadDeck();
  }

  loadDeck() {
    this.deckCards = [];
    const cardRequests = this.deckList.map(card => this.scryfallService.getCardByName(card.name));
    forkJoin(cardRequests).subscribe({
      next: (cards) => {
        this.deckCards = cards.map((card,index) => {
          const initialFaceIndex = card.card_faces ? 1 : 0;

          const cardData: Cart = {
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
            sanitizedProducedMana: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(this.formatProducedMana(card.produced_mana))),
            card_faces: card.card_faces || null,
            currentFaceIndex: initialFaceIndex,
            quantity: this.deckList[index].quantity,
            isSingleImageDoubleFace: this.isSingleImageDoubleFace(card),
          };

          if (cardData.card_faces && !cardData.isSingleImageDoubleFace) {
            this.toggleCardFace(cardData);
          }

          return cardData;
        });

        this.deckService.setDeckCards(this.deckCards);
      },
      error: (err) => console.error('Error al cargar el mazo:', err),
    });
  }

  toggleCardFace(card: Cart) {
    if (card.card_faces) {
      card.currentFaceIndex = card.currentFaceIndex === 0 ? 1 : 0;
      const newFace = card.card_faces[card.currentFaceIndex];

      card.name = newFace.name;
      card.image_uris = newFace.image_uris;
      card.oracle_text = newFace.oracle_text;
      card.type_line = newFace.type_line;
      card.mana_cost = newFace.mana_cost;
      card.sanitizedManaCost = this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(newFace.mana_cost));
      card.sanitizedOracleText = this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(newFace.oracle_text, card.keywords));
    }
  }

  private replaceManaSymbolsAndHighlightTriggers(text?: string, keywords: string[] = []): string {
    if (!text) return '';

    text = text.replace(/(Whenever|At|When)([^,]*)(,)([^.]+)(\.)?/g, (match, trigger, rest, comma, after, period) => {
      return `<span class="text-warning fw-bold">${trigger}${rest}${comma}</span><span class="text-success">${after}${period || ''}</span>`;
    });

    text = text.replace(/((?:<img [^>]+>|[A-Za-z\s,']?)+:\s*)(.*?)(\.)/gm, (match, cost, effect) => {
      return `<span class="text-info fw-bold">${cost}</span> <span class="text-success">${effect}.</span>`;
    });

    keywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      text = text?.replace(keywordRegex, `<span class="text-primary">${keyword}</span>`);
    });

    return text.replace(/\{([^}]+)}/g, (_, symbol) => {
      return `<img src="https://svgs.scryfall.io/card-symbols/${symbol}.svg"
                 alt="${symbol}"
                 style="width: 20px; height: auto; vertical-align: middle;">`;
    });
  }

  private formatProducedMana(manaList?: string[]): string {
    if (!manaList) return '';
    const sortedMana = manaList.sort((a, b) => this.manaOrder.indexOf(a) - this.manaOrder.indexOf(b));
    return sortedMana.map(mana => `{${mana}}`).join(', ');
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private isSingleImageDoubleFace(card: any): boolean {
    return (card.card_faces && !card.card_faces.some((face: any) => face.image_uris?.normal));
  }
}
