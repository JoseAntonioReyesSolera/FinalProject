import { Injectable } from '@angular/core';
import { StackService } from './stack.service';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';
import { LogService } from './log.service';
import { GameStorageService } from './game-storage.service';

@Injectable({ providedIn: 'root' })
export class TriggerService {
  constructor(
    private readonly stack: StackService,
    private readonly logService: LogService,
    private readonly gameStorage: GameStorageService,
  ) {}

  detectZoneChangeTriggers(card: Cart, from: string, to: string) {
    const oracle = (card.oracle_text || '').toLowerCase();
    const lines = oracle.split('\n').map(l => l.trim());

    for (const line of lines) {
      const subTriggers = this.extractMultipleTriggers(line);
      for (const trigger of subTriggers) {
        if (to === 'battlefield' && trigger.startsWith('when') && trigger.includes('enters')) {
          this.logService.addLog('[TriggerService.detectZoneChangeTriggers.enter]');
          this.logService.addLog('[TriggerService.pushTrigger] detectZoneChange enters');
          this.pushTrigger(card, trigger);
        }
        if (from === 'battlefield' && to === 'graveyard' && trigger.startsWith('when') && trigger.includes('dies')) {
          this.logService.addLog('[TriggerService.detectZoneChangeTriggers.dies]');
          this.logService.addLog('[TriggerService.pushTrigger] detectZoneChange dies');
          this.pushTrigger(card, trigger);
        }
        if (from === 'battlefield' && to !== 'graveyard' && trigger.startsWith('when') && trigger.includes('leaves')) {
          this.logService.addLog('[TriggerService.detectZoneChangeTriggers.leave]');
          this.logService.addLog('[TriggerService.pushTrigger] detectZoneChange leaves');
          this.pushTrigger(card, trigger);
        }
      }
    }
  }

  detectBattlefieldTriggers(
    event: 'enters' | 'dies' | 'leaves',
    affected: Permanent | Permanent[] | undefined,
    others: Permanent[]
  ) {
    switch (event) {
      case 'enters': {
        const entered = affected as Permanent[];
        this.logService.addLog('[TriggerService.detectBattlefieldTriggers.enters]');
        this.checkSelfEntry(entered);
        this.checkEntry(entered, others);
        break;
      }
      case 'dies': {
        const died = affected as Permanent;
        this.logService.addLog('[TriggerService.detectBattlefieldTriggers.dies]');
        if (!this.hasZoneChangeWhen(died.originalCard.oracle_text, 'dies')) {
          this.checkSelfDies(died);
        }
        this.checkDies(died, others);
        break;
      }
      case 'leaves':
        this.logService.addLog('[TriggerService.detectBattlefieldTriggers.leaves]');
        this.checkLeaves(others);
        break;
    }
  }

  detectCastTriggers(card: Cart, battlefield: Permanent[]) {
    const oracle = (card.oracle_text || '').toLowerCase();
    const lines = oracle.split('\n').map(l => l.trim());
    this.logService.addLog('[TriggerService.detectCastTriggers]');

    // Self triggers on the spell itself casting
    const selfMatches = lines.filter(l => /^when you cast this spell/.test(l));
    selfMatches.forEach(text => {
      this.logService.addLog('[TriggerService.pushTrigger] self cast');
      this.pushTrigger(card, text);
    });

    // Other permanents reacting to your cast
    battlefield.forEach(perm => {
      const olines = (perm.originalCard.oracle_text || '')
        .toLowerCase()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.includes('whenever you cast'));

      olines.forEach(text => {
        this.logService.addLog('[TriggerService.pushTrigger] other cast');

        // Optional: filter by historic type spells only
        if (
          text.includes('historic spell') &&
          !card.type_line.toLowerCase().includes('artifact') &&
          !card.type_line.toLowerCase().includes('legendary') &&
          !card.type_line.toLowerCase().includes('saga')
        ) {
          return;
        }
        this.pushTrigger(perm, text);
      });
    });
  }

  reorderTriggers(newOrder: number[]): void {
    const current = this.stack.getCurrentStackSnapshot();
    const reordered = newOrder.map(i => current[i]).filter(x => !!x);
    this.stack.setStackFromSnapshot(reordered);
  }

  private checkSelfEntry(entered: Permanent[]) {
    entered.forEach(e => {
      (e.originalCard.oracle_text || '')
        .toLowerCase()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.includes('whenever') && l.includes('enters'))
        .forEach(text => {
          if (text.includes('this') || text.includes(e.name.toLowerCase())) {
            this.logService.addLog('[TriggerService.checkSelfEntry]');
            this.pushTrigger(e, text);
          }
        });
    });
  }

  private checkEntry(entered: Permanent[], before: Permanent[]) {
    const enteredTypes = entered.map(e => e.type.toLowerCase());

    before.forEach(perm => {
      (perm.originalCard.oracle_text || '')
        .toLowerCase()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.includes('whenever') && l.includes('enters'))
        .forEach(text => {
          const txt = text;
          const matchType = txt.match(/another\s+([a-z]+)(?:\s+you control)?\s+enters/);
          if (matchType) {
            const reqType = matchType[1];
            if (enteredTypes.some(t => t.includes(reqType))) {
              this.logService.addLog('[TriggerService.checkEntry] another ' + reqType);
              this.pushTrigger(perm, text);
            }
            return;
          }
          const matchGeneric = txt.match(/whenever\s+a[nother]*\s+([a-z]+)(?:\s+you control)?\s+enters/);
          if (matchGeneric) {
            const reqType = matchGeneric[1];
            if (enteredTypes.some(t => t.includes(reqType))) {
              this.logService.addLog('[TriggerService.checkEntry] generic ' + reqType);
              this.pushTrigger(perm, text);
            }
            return;
          }
        });
    });
  }

  private checkSelfDies(died: Permanent) {
    (died.originalCard.oracle_text || '')
      .toLowerCase()
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.includes('whenever') && l.includes('dies'))
      .forEach(text => {
        if (text.includes('this')) {
          this.logService.addLog('[TriggerService.checkSelfDies]');
          this.pushTrigger(died, text);
        }
      });
  }

  private checkDies(died: Permanent, before: Permanent[]) {
    const diedName = died.name.toLowerCase();
    const diedType = died.type.toLowerCase();

    before.forEach(perm => {
      (perm.originalCard.oracle_text || '')
        .toLowerCase()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.includes('whenever') && l.includes('dies'))
        .forEach(text => {
          const txt = text;
          const matchType = txt.match(/another\s+([a-z]+)(?:\s+you control)?\s+dies/);
          if (matchType) {
            const reqType = matchType[1];
            if (diedType.includes(reqType)) {
              this.logService.addLog('[TriggerService.checkDies] another ' + reqType);
              this.pushTrigger(perm, text);
            }
            return;
          }
          if (txt.includes(diedName) || txt.includes(diedType)) {
            this.logService.addLog('[TriggerService.checkDies] specific match');
            this.pushTrigger(perm, text);
          }
        });
    });
  }

  private checkLeaves(before: Permanent[]) {
    before.forEach(perm => {
      (perm.originalCard.oracle_text || '')
        .toLowerCase()
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.includes('whenever') && l.includes('leaves'))
        .forEach(text => {
          this.logService.addLog('[TriggerService.checkLeaves]');
          this.pushTrigger(perm, text);
        });
    });
  }

  private hasZoneChangeWhen(oracle: string, keyword: 'enters' | 'dies' | 'leaves'): boolean {
    return (oracle || '')
      .toLowerCase()
      .split('\n')
      .map(l => l.trim())
      .some(l => /^when\s/.test(l) && l.includes(keyword));
  }

  public detectBeginningOfStepTriggers(stepName: string, battlefield: Permanent[]) {
    battlefield.forEach(perm => {
      const lines = (perm.originalCard.oracle_text || '')
        .toLowerCase()
        .split('\n')
        .map(l => l.trim());

      lines.forEach(line => {
        if (line.includes('at the beginning of') && line.includes(stepName.toLowerCase())) {
          this.logService.addLog(`[TriggerService] Beginning of step trigger: ${stepName} on ${perm.name}`);
          this.pushTrigger(perm, line);
        }
      });
    });
  }

  public detectEndOfStepTriggers(stepName: string, battlefield: Permanent[]) {
    battlefield.forEach(perm => {
      const lines = (perm.originalCard.oracle_text || '')
        .toLowerCase()
        .split('\n')
        .map(l => l.trim());
      lines.forEach(line => {
        if (line.includes('at the beginning of the end step') && stepName.toLowerCase().includes('end')) {
          this.logService.addLog(`[TriggerService] End step trigger on ${perm.name}`);
          this.pushTrigger(perm, line);
        }
      });
    });
  }

  private pushTrigger(source: Cart | Permanent, text: string) {
    this.stack.pushToStack({
      source,
      description: text,
      type: 'TriggeredAbility',
    });
  }

  private extractMultipleTriggers(line: string): string[] {
    if (!line.includes(' and ')) return [line];
    const parts = line.split(' and ').map(s => s.trim());
    return parts.map(part => (part.includes('when') ? part : 'when ' + part));
  }
}
