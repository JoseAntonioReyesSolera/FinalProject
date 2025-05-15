import { Injectable } from '@angular/core';
import { StackService } from './stack.service';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';

@Injectable({ providedIn: 'root' })
export class TriggerService {
  constructor(private readonly stack: StackService) {}

  detectZoneChangeTriggers(card: Cart, from: string, to: string): void {
    const oracle = (card.oracle_text || '').toString();
    const baseName = card.name.split(',')[0].toLowerCase();

    const etbEffect = to === 'battlefield' ? this.extractETB(oracle, baseName) : null;
    const ltbEffect = from === 'battlefield' ? this.extractLeaves(oracle, baseName) : null;
    const dieEffect = from === 'battlefield' && to === 'graveyard' ? this.extractDies(oracle, baseName) : null;

    if (etbEffect) {
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: 'triggers an ETB ability:',
        efecto: etbEffect
      });
    }

    if (dieEffect) {
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: 'triggers dies:',
        efecto: dieEffect
      });
    }

    if (ltbEffect) {
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: 'trigger leaves the battlefield:',
        efecto: ltbEffect
      });
    }
  }

  detectBattlefieldTriggers(permanent: Permanent, event: 'entry' | 'leaves' | 'dies', allBefore: Permanent[] = []): void {
    const oracle = permanent.originalCard.oracle_text || '';
    const type = permanent.type.toLowerCase();

    const triggers = oracle.split('\n')
      .map(l => l.trim())
      .filter(l => {
        if (event === 'entry') return /whenever .* enters/i.test(l);
        if (event === 'dies') return /when .* dies/i.test(l);
        if (event === 'leaves') return /when .* leaves the battlefield/i.test(l);
        return false;
      });

    for (const text of triggers) {
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: permanent.originalCard,
        description: `triggered ability:`,
        efecto: text
      });
    }

    // Detectar si otros permanentes deben reaccionar
    if (event === 'entry') {
      for (const before of allBefore) {
        const oracleText = before.originalCard.oracle_text || '';
        const lines = oracleText.split('\n').map(l => l.trim());

        for (const line of lines) {
          const pattern = /whenever\s+(.+?)\s+enters/i;
          const match = pattern.exec(line);
          if (!match) continue;

          const condition = match[1].toLowerCase();

          if (
            condition.includes('another') && permanent.originalCard.id === before.originalCard.id
          ) continue;

          const matchesType = type.includes(condition) || condition.includes('permanent') || condition.includes('creature') && type.includes('creature');

          if (matchesType) {
            this.stack.pushToStack({
              type: 'TriggeredAbility',
              source: before.originalCard,
              description: 'triggered by battlefield entry of another:',
              efecto: line
            });
          }
        }
      }
    }
  }

  private extractETB(oracle: string, cardName: string): string | null {
    return this.extractLineMatching(oracle, /^when .* enters/i);
  }

  private extractDies(oracle: string, cardName: string): string | null {
    return this.extractLineMatching(oracle, /^when .* dies/i);
  }

  private extractLeaves(oracle: string, cardName: string): string | null {
    return this.extractLineMatching(oracle, /^when .* leaves the battlefield/i);
  }

  private extractLineMatching(oracle: string, pattern: RegExp): string | null {
    const lines = oracle.split('\n');
    const match = lines.find(line => pattern.test(line.trim()));
    return match?.trim() || null;
  }
}
