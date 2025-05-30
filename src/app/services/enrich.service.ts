import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Cart } from '../models/cart';
import keywordExplanations from '../../assets/keywordExplanations.json';

@Injectable({ providedIn: 'root' })
export class CardEnrichmentService {
  private readonly manaOrder = ['W', 'U', 'B', 'R', 'G'];
  keywordExplanations: { [key: string]: string } = keywordExplanations;

  constructor(private readonly sanitizer: DomSanitizer) {}

  enrichCard(card: Cart): Cart {
    const enrichFace = (face: any): any => ({
      ...face,
      sanitizedManaCost: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(face.mana_cost)),
      sanitizedOracleText: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(face.oracle_text)),
      cmc: face.cmc ?? card.cmc,
      type_line: face.type_line ?? card.type_line,
    });

    const enriched: Cart = {
      ...card,
      currentFaceIndex: card.card_faces ? 0 : 1,
      isSingleImageDoubleFace: this.isSingleImageDoubleFace(card),
      sanitizedManaCost: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(card.mana_cost)),
      sanitizedOracleText: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(this.getOracleText(card))),
      sanitizedProducedMana: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(this.formatProducedMana(card.produced_mana))),
      card_faces: card.card_faces?.map(enrichFace),
    };

    if (enriched.card_faces && !enriched.isSingleImageDoubleFace) {
      this.toggleCardFace(enriched);
    }

    return enriched;
  }

  toggleCardFace(card: Cart): void {
    if (!card.card_faces) return;
    card.currentFaceIndex = card.currentFaceIndex ? 1 : 0;
    const newFace = card.card_faces[card.currentFaceIndex];

    card.name = newFace.name;
    card.image_uris = newFace.image_uris;
    card.oracle_text = newFace.oracle_text;
    card.type_line = newFace.type_line;
    card.mana_cost = newFace.mana_cost;
    card.power = newFace.power;
    card.toughness = newFace.toughness;

    card.sanitizedManaCost = this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(newFace.mana_cost));
    card.sanitizedOracleText = this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(newFace.oracle_text));
  }

  replaceManaSymbolsAndHighlightTriggers(text?: string): string {
    if (!text) return '';

    text = text.replace(/(Whenever|At|When|As|If)([^,]*)(,)([^.]+)(\.)?/g, (match, trigger, rest, comma, after, period) => {
      return `<span class="text-warning fw-bold">${trigger}${rest}${comma}</span><span class="text-success">${after}${period ?? ''}</span>`;
    });

    text = text.replace(/(((?:<img [^>]+>|\w|[−+,'\s])+):\s*)(.*?)(\.)/gm, (match, cost, effect) => {
      return `<span class="text-info fw-bold">${cost}</span> <span class="text-success">${effect}.</span>`;
    });

    const keywordsWithTooltips = Object.keys(this.keywordExplanations);
    const keywordRegex = new RegExp(`\\b(${keywordsWithTooltips.join('|')})\\b`, 'gi');

    text = text.replace(keywordRegex, (match) => {
      const keywordEntry = Object.entries(this.keywordExplanations)
        .find(([key]) => key.toLowerCase() === match.toLowerCase());
      const description = keywordEntry?.[1];
      if (description) {
        return `<span title="${description}" class="text-primary">${match}</span>`;
      }
      return match;
    });

    return text.replace(/\{([^}]+)}/g, (_, symbol) => {
      const cleanSymbol = symbol.replace('/', '').toUpperCase();
      return `<img src="https://svgs.scryfall.io/card-symbols/${cleanSymbol}.svg"
                 alt="{${symbol}}"
                 style="width: 20px; height: auto; vertical-align: middle;">`;
    });
  }

  private formatProducedMana(manaList?: string[]): string {
    if (!manaList) return '';
    const sorted = manaList.toSorted((a, b) => this.manaOrder.indexOf(a) - this.manaOrder.indexOf(b));
    return sorted.map(mana => `{${mana}}`).join(', ');
  }

  private getOracleText(card: any): string | undefined {
    if (card.oracle_text) return card.oracle_text;
    if (card.card_faces && card.card_faces.length > 0) {
      const currentFace = card.card_faces[card.currentFaceIndex ?? 0];
      return currentFace?.oracle_text;
    }
    return undefined;
  }

  private isSingleImageDoubleFace(card: any): boolean {
    return (card.card_faces && !card.card_faces.some((face: any) => face.image_uris?.normal));
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
