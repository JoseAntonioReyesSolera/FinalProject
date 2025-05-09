import { Injectable } from '@angular/core';
import { GameState } from '../models/game-state';

@Injectable({ providedIn: 'root' })
export class GameStorageService {
  private readonly STORAGE_KEY = 'mtg_saved_games';

  saveGame(state: GameState) {
    const allGames = this.getAllGames();
    allGames[state.id] = state;
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
