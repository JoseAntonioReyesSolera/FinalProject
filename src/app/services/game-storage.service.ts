import {Injectable} from '@angular/core';
import {GameState} from '../models/game-state';
import {Cart} from '../models/cart';
import {Permanent} from '../models/permanent';

@Injectable({ providedIn: 'root' })
export class GameStorageService {
  private readonly STORAGE_KEY = 'mtg_saved_games';

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

    allGames[state.id] = {
      ...state,
      cards: state.cards.map(stripCard),
      battlefield: state.battlefield.map(stripPermanent),
      stack: state.stack.map(item => ({
        ...item,
        source: 'originalCard' in item.source
          ? {
            ...item.source,
            originalCard: stripCard((item.source).originalCard)
          }
          : stripCard(item.source)
      })),
    };
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
}
