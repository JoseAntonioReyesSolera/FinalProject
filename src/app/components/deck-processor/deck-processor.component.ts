import { Component } from '@angular/core';
import {Cart} from '../../models/cart';
import {ScryfallService} from '../../services/scryfall.service';
import { DeckService } from '../../services/deck.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {forkJoin, isEmpty} from 'rxjs';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-deck-processor',
  imports: [FormsModule],
  templateUrl: './deck-processor.component.html',
  styleUrl: './deck-processor.component.css'
})
export class DeckProcessorComponent {
  deckInput: string = '';
  deckMainList: { name: string, quantity: number }[] = [];
  deckSideboardList: { name: string, quantity: number }[] = [];
  deckCards: Cart[] = [];
  private readonly manaOrder = ['W', 'U', 'B', 'R', 'G'];

  constructor(
              private readonly scryfallService: ScryfallService,
              private readonly sanitizer: DomSanitizer,
              private readonly deckService: DeckService,
    ) {}

  processDeckInput() {
    const [mainPart, sidePart] = this.deckInput.split(/^\s*SIDEBOARD:\s*$/m);

    // Procesar el mazo principal
    this.deckMainList = mainPart
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        const match = /^(\d+)\s+(.+)$/.exec(line);
        return match ? { quantity: parseInt(match[1], 10), name: match[2] } : { quantity: 1, name: line };
      });

    // Si hay banquillo, lo añadimos también a deckList con una marca para luego separarlo
    if (sidePart) {
      this.deckSideboardList = sidePart
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
          const match = /^(\d+)\s+(.+)$/.exec(line);
          return match ? { quantity: parseInt(match[1], 10), name: match[2] } : { quantity: 1, name: line };
        });
    } else {
      this.deckSideboardList = [];
    }
    this.loadDeck();
  }

  loadDeck() {
    const cardMapMain: { [name: string]: number } = {};
    this.deckMainList.forEach(card => {
      const name = card.name.trim().toLowerCase();
      cardMapMain[name] = (cardMapMain[name] || 0) + card.quantity;
    });

    const unifiedMainList = Object.entries(cardMapMain).map(([name, quantity]) => ({ name, quantity }));
    const mainRequests = unifiedMainList.map(card => this.scryfallService.getCardByName(card.name));

    const sideRequests = this.deckSideboardList.map(card => this.scryfallService.getCardByName(card.name));

    forkJoin([...mainRequests, ...sideRequests]).subscribe({
      next: (cards) => {
        const allCards: Cart[] = cards.map((card, index) => {
          const isSide = index >= unifiedMainList.length;
          const cardData: Cart = {
            instanceId: card.id + '-' + self.crypto?.randomUUID?.() || Math.random().toString(36).substring(2),
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
            color_identity: card.color_identity,
            sanitizedManaCost: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(card.mana_cost)),
            sanitizedOracleText: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(card.oracle_text, card.keywords)),
            sanitizedProducedMana: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(this.formatProducedMana(card.produced_mana))),
            card_faces: card.card_faces || null,
            currentFaceIndex: card.card_faces ? 1 : 0,
            quantity: isSide ? this.deckSideboardList[index - unifiedMainList.length].quantity : unifiedMainList[index].quantity,
            isSingleImageDoubleFace: this.isSingleImageDoubleFace(card),
            isCommander: false,
            zone: 'library',
          };

          if (cardData.card_faces && !cardData.isSingleImageDoubleFace) {
            this.toggleCardFace(cardData);
          }

          return cardData;
        });

        const mainDeck = allCards.slice(0, unifiedMainList.length);
        const sideboard = allCards.slice(unifiedMainList.length);

        this.deckCards = mainDeck;
        this.deckService.setDeckCards(mainDeck, sideboard);
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

    text = text.replace(/(Whenever|At|When|As|If)([^,]*)(,)([^.]+)(\.)?/g, (match, trigger, rest, comma, after, period) => {
      return `<span class="text-warning fw-bold">${trigger}${rest}${comma}</span><span class="text-success">${after}${period || ''}</span>`;
    });

    text = text.replace(/((?:<img [^>]+>|[\−\+A-Za-z0-9\s,']?)+:\s*)(.*?)(\.)/gm, (match, cost, effect) => {
      return `<span class="text-info fw-bold">${cost}</span> <span class="text-success">${effect}.</span>`;
    });

    keywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      text = text?.replace(keywordRegex, `<span class="text-primary">${keyword}</span>`);
    });

    return text.replace(/\{([^}]+)}/g, (_, symbol) => {
      const cleanSymbol = symbol.replace('/', '');
      return `<img src="https://svgs.scryfall.io/card-symbols/${cleanSymbol}.svg"
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
