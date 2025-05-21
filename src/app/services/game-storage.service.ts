import { Injectable } from '@angular/core';
import { GameState } from '../models/game-state';
import {Cart} from '../models/cart';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Permanent} from '../models/permanent';

@Injectable({ providedIn: 'root' })
export class GameStorageService {
  private readonly manaOrder = ['W', 'U', 'B', 'R', 'G'];
  private readonly STORAGE_KEY = 'mtg_saved_games';
  constructor(private readonly sanitizer: DomSanitizer) {}
  saveGame(state: GameState) {
    const allGames = this.getAllGames();
    const stripCard = (c: Cart): Cart => {
      const {
        sanitizedManaCost,
        sanitizedOracleText,
        sanitizedProducedMana,
        combinedManaCost,
        combinedOracleText,
        combinedImageUris,
        ...raw
      } = c;
      return raw as Cart;
    };

    const stripPermanent = (p: Permanent): Permanent => {
      const {
        oracle_text,
        originalCard,
        ...raw
      } = p;

      return {
        ...raw,
        originalCard: stripCard(originalCard)
      };
    };

    const strippedState: GameState = {
      ...state,
      cards: state.cards.map(stripCard),
      battlefield: state.battlefield.map(stripPermanent),
      stack: state.stack.map(item => ({
        ...item,
        source: 'originalCard' in item.source
          ? {
            ...item.source,
            originalCard: stripCard((item.source as Permanent).originalCard)
          }
          : stripCard(item.source as Cart)
      })),
    };

    allGames[state.id] = strippedState;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allGames));
  }

  loadGame(id: string): GameState | null {
    const allGames = this.getAllGames();
    return allGames[id] || null;
  }

  deleteGame(id: string) {
    const allGames = this.getAllGames();
    delete allGames[id];
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allGames));
  }

  listGameSummaries(): { id: string; date: string }[] {
    const allGames = this.getAllGames();
    return Object.values(allGames).map(({ id, date }) => ({ id, date }));
  }

  private getAllGames(): Record<string, GameState> {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  }

  // ——— Métodos de enrich ———

  enrichCard(card: Cart): Cart {
    const enrichFace = (face: any): any => ({
      ...face,
      sanitizedManaCost: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(face.mana_cost)),
      sanitizedOracleText: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(face.oracle_text, card.keywords)),
      cmc: face.cmc ?? card.cmc,
      type_line: face.type_line ?? card.type_line,
    });

    const enriched: Cart = {
      ...card,
      currentFaceIndex: card.card_faces ? 0 : 1,  // Comienza en la cara frontal si existe
      isSingleImageDoubleFace: this.isSingleImageDoubleFace(card),
      sanitizedManaCost: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(card.mana_cost)),
      sanitizedOracleText: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(this.getOracleText(card), card.keywords)),
      sanitizedProducedMana: this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(this.formatProducedMana(card.produced_mana))),
      card_faces: card.card_faces?.map(enrichFace),  // Enriquecemos todas las caras si existen
    };

    // Si es una carta de doble cara y no usa una imagen única para ambas caras
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
    card.sanitizedOracleText = this.sanitizeHtml(this.replaceManaSymbolsAndHighlightTriggers(newFace.oracle_text, card.keywords));
  }

  replaceManaSymbolsAndHighlightTriggers(text?: string, keywords: string[] = []): string {
    if (!text) return '';

    text = text.replace(/(Whenever|At|When|As|If)([^,]*)(,)([^.]+)(\.)?/g, (match, trigger, rest, comma, after, period) => {
      return `<span class="text-warning fw-bold">${trigger}${rest}${comma}</span><span class="text-success">${after}${period ?? ''}</span>`;
    });

    text = text.replace(/((?:<img [^>]+>|[−+A-Za-z0-9\s,']?)+:\s*)(.*?)(\.)/gm, (match, cost, effect) => {
      return `<span class="text-info fw-bold">${cost}</span> <span class="text-success">${effect}.</span>`;
    });

    keywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
      text = text?.replace(keywordRegex, `<span class="text-primary">${keyword}</span>`);
    });

    return text.replace(/\{([^}]+)}/g, (_, symbol) => {
      const cleanSymbol = symbol.replace('/', '').toUpperCase();
      return `<img src="https://svgs.scryfall.io/card-symbols/${cleanSymbol}.svg"
                 alt="${symbol}"
                 style="width: 20px; height: auto; vertical-align: middle;">`;
    });
  }

  private formatProducedMana(manaList?: string[]): string {
    if (!manaList) return '';
    const sorted = manaList.sort((a, b) => this.manaOrder.indexOf(a) - this.manaOrder.indexOf(b));
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
