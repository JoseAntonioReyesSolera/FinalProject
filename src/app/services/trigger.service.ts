import { Injectable } from '@angular/core';
import { StackService } from './stack.service';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';

@Injectable({ providedIn: 'root' })
export class TriggerService {
  constructor(private readonly stack: StackService) {}

  detectZoneChangeTriggers(card: Cart, from: string, to: string): void {
    const oracle = (card.oracle_text || '').toString().toLowerCase();
    const etb = to === 'battlefield' ? this.extractLine(oracle, /^when .* enters/i) : null;
    const ltb = from === 'battlefield' ? this.extractLine(oracle, /^when .* leaves the battlefield/i) : null;
    const dies = from === 'battlefield' && to === 'graveyard'
      ? this.extractLine(oracle, /^when .* dies/i)
      : null;

    if (etb)  this.push(card, 'triggers an ETB ability:', etb);
    if (dies) this.push(card, 'triggers dies:',              dies);
    if (ltb)  this.push(card, 'trigger leaves the battlefield:', ltb);
  }

  detectBattlefieldTriggers(
    permanent: Permanent,
    event: 'entry' | 'dies' | 'leaves',
    allBefore: Permanent[] = []
  ): void {
    this.pushSelfTriggers(permanent, event);
    if (event === 'entry') {
      this.pushOtherEntryTriggers(permanent, allBefore);
    }
  }

  // — Helpers for detectBattlefieldTriggers —

  private pushSelfTriggers(permanent: Permanent, event: 'entry' | 'dies' | 'leaves') {
    const oracle = permanent.originalCard.oracle_text || '';
    const lines = oracle
      .split('\n')
      .map(l => l.trim())
      .filter(l =>
        (event === 'entry' && /whenever .* enters/i.test(l)) ||
        (event === 'dies'  && /when .* dies/i.test(l))  ||
        (event === 'leaves'&& /when .* leaves the battlefield/i.test(l))
      );

    for (const text of lines) {
      this.push(permanent.originalCard, 'triggered ability:', text);
    }
  }

  private pushOtherEntryTriggers(permanent: Permanent, beforeList: Permanent[]) {
    const type = permanent.type.toLowerCase();
    for (const before of beforeList) {
      const oracleText = before.originalCard.oracle_text || '';
      for (const line of oracleText.split('\n').map(l => l.trim())) {
        const m = /whenever\s+(.+?)\s+enters/i.exec(line);
        if (!m) continue;

        const cond = m[1].toLowerCase();
        const isSame = cond.includes('another') && permanent.originalCard.id === before.originalCard.id;
        const matches =
          (!cond.includes('another') || !isSame) &&
          (
            cond.includes('permanent') ||
            (cond.includes('creature') && type.includes('creature')) ||
            type.includes(cond)
          );

        if (matches) {
          this.push(
            before.originalCard,
            'triggered by battlefield entry of another:',
            line
          );
        }
      }
    }
  }

  // — Common utilities —

  private extractLine(oracle: string, pattern: RegExp): string | null {
    const line = oracle
      .split('\n')
      .find(l => pattern.test(l.trim()));
    return line ? line.trim() : null;
  }

  private push(source: Cart | Permanent, desc: string, efecto: string) {
    this.stack.pushToStack({
      type: 'TriggeredAbility',
      source,
      description: desc,
      efecto: efecto.trim(),
    });
  }
}
