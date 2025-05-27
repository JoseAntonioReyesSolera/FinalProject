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

  private extractOracleLines(card: Cart): string[] {
    return (card?.oracle_text || '')
      .toLowerCase()
      .split('\n')
      .map(l => l.trim());
  }

  detectZoneChangeTriggers(card: Cart, from: string, to: string) {
    const lines = this.extractOracleLines(card);
    for (const line of lines) {
      const subTriggers = this.extractMultipleTriggers(line);
      for (const trigger of subTriggers) {
        if (trigger.includes('cast')) continue;
        if (to === 'battlefield' && this.isTrigger(trigger, 'enters', 'when')) {
          this.pushTrigger(card, trigger, 'detectZoneChangeTriggers.enter');
        }
        if (from === 'battlefield' && to === 'graveyard' && this.isTrigger(trigger, 'dies', 'when')) {
          this.pushTrigger(card, trigger, 'detectZoneChangeTriggers.dies');
        }
        if (from === 'battlefield' && to !== 'graveyard' && this.isTrigger(trigger, 'leaves', 'when')) {
          this.pushTrigger(card, trigger, 'detectZoneChangeTriggers.leave');
        }
      }
    }
  }

  detectBattlefieldTriggers(event: 'enters' | 'dies' | 'leaves', affected: Permanent | Permanent[] | undefined, others: Permanent[]) {
    switch (event) {
      case 'enters': {
        const entered = affected as Permanent[];
        this.checkBattlefieldTrigger(entered, others, 'enters');
        break;
      }
      case 'dies': {
        const died = affected as Permanent;
        if (!this.hasZoneChangeWhen(died.originalCard.oracle_text, 'dies')) {
          this.checkSelfTrigger(died, 'dies');
        }
        this.checkOthersTrigger(died, others, 'dies');
        break;
      }
      case 'leaves': {
        this.checkOthersTrigger(null, others, 'leaves');
        break;
      }
    }
  }

  detectCastTriggers(card: Cart, battlefield: Permanent[]) {
    const lines = this.extractOracleLines(card);
    lines.filter(l => l.startsWith("when you cast this spell")).forEach(text => {
      this.pushTrigger(card, text, 'detectCastTriggers.this');
    });

    battlefield.forEach(perm => {
      const lines = this.extractOracleLines(perm.originalCard).filter(l => l.includes('whenever you cast'));
      lines.forEach(text => {
        if (text.includes('historic spell') && !this.isHistoric(card)) return;
        this.pushTrigger(perm, text, 'detectCastTriggers.other');
      });
    });
  }

  detectBeginningOfStepTriggers(stepName: string, battlefield: Permanent[]) {
    battlefield.forEach(perm => {
      this.extractOracleLines(perm.originalCard).forEach(line => {
        if (line.includes('at the beginning of') && line.includes(stepName.toLowerCase())) {
          this.pushTrigger(perm, line, 'detectBeginningOfStepTriggers');
        }
      });
    });
  }

  detectEndOfStepTriggers(stepName: string, battlefield: Permanent[]) {
    battlefield.forEach(perm => {
      this.extractOracleLines(perm.originalCard).forEach(line => {
        if (line.includes('at the beginning of the end step') && stepName.toLowerCase().includes('end')) {
          this.pushTrigger(perm, line, 'detectEndOfStepTriggers');
        }
      });
    });
  }

  reorderTriggers(newOrder: number[]): void {
    const current = this.stack.getCurrentStackSnapshot();
    const reordered = newOrder.map(i => current[i]).filter(x => !!x);
    this.stack.setStackFromSnapshot(reordered);
  }

  private checkBattlefieldTrigger(entered: Permanent[], before: Permanent[], type: 'enters') {
    entered.forEach(e => this.checkSelfTrigger(e, type));

    before.forEach(perm => {
      this.extractOracleLines(perm.originalCard).forEach(text => {
        if (!text.includes('whenever') || !text.includes('enters')) return;

        for (const e of entered) {
          if (this.isTriggerMatchingEnteredCard(text, e)) {
            this.pushTrigger(perm, text, 'checkBattlefieldTrigger.enter.permanent');
            break; // Evita pushear múltiples veces para el mismo permanente
          }
        }
      });
    });
  }


  private isTriggerMatchingEnteredCard(triggerLine: string, entered: Permanent): boolean {
    const line = triggerLine.toLowerCase();
    const typeLine = entered.type.toLowerCase();

    // Clases comunes
    const isLand = typeLine.includes('land');
    const isCreature = typeLine.includes('creature');
    const isArtifact = typeLine.includes('artifact');
    const isEnchantment = typeLine.includes('enchantment');
    const isPlaneswalker = typeLine.includes('planeswalker');
    const isToken = entered.originalCard.name.toLowerCase().includes('token'); // o usa un flag si lo tienes

    if (line.includes('a land') && !isLand) return false;
    if (line.includes('a creature') && !isCreature) return false;
    if (line.includes('an artifact') && !isArtifact) return false;
    if (line.includes('an enchantment') && !isEnchantment) return false;
    if (line.includes('a planeswalker') && !isPlaneswalker) return false;
    if (line.includes('a nontoken') && isToken) return false;

    return true;
  }


  private checkSelfTrigger(card: Cart | Permanent, type: 'enters' | 'dies') {
    this.extractOracleLines(this.stack.isPermanent(card) ? card.originalCard : card)
      .filter(l => l.includes('whenever') && l.includes(type))
      .forEach(text => {
        if (text.includes('this') || (this.stack.isPermanent(card) && text.includes(card.name.toLowerCase()))) {
          this.pushTrigger(card, text, 'checkSelfTrigger');
        }
      });
  }

  private checkOthersTrigger(died: Permanent | null, before: Permanent[], type: 'dies' | 'leaves') {
    const diedName = died?.name.toLowerCase();
    const diedType = died?.type.toLowerCase();

    before.forEach(perm => {
      this.extractOracleLines(perm.originalCard).forEach(text => {
        if (!text.includes('whenever') || !text.includes(type)) return;

        const match = text.match(/another\s+([a-z]+)(?:\s+you control)?\s+dies/);
        if (match && diedType?.includes(match[1])) {
          this.pushTrigger(perm, text, 'checkOthersTrigger.enter');
          return;
        }

        if (diedName && (text.includes(diedName) || (diedType && text.includes(diedType)))) {
          this.pushTrigger(perm, text, 'checkOthersTrigger.dies');
        } else if (type === 'leaves') {
          this.pushTrigger(perm, text, 'checkOthersTrigger.leaves');
        }
      });
    });
  }

  private isTrigger(text: string, keyword: string, start: 'when' | 'whenever'): boolean {
    const normalized = text.toLowerCase().trim();
    if (start === 'when') return normalized.startsWith('when ') && normalized.includes(keyword);
    if (start === 'whenever') return normalized.startsWith('whenever ') && normalized.includes(keyword);
    return false;
  }

  private isHistoric(card: Cart): boolean {
    const typeLine = card.type_line.toLowerCase();
    return typeLine.includes('artifact') || typeLine.includes('legendary') || typeLine.includes('saga');
  }

  private hasZoneChangeWhen(oracle: string, keyword: 'enters' | 'dies' | 'leaves'): boolean {
    return (oracle || '')
      .toLowerCase()
      .split('\n')
      .map(l => l.trim())
      .some(l => l.startsWith('when') && l.includes(keyword));
  }

  private extractMultipleTriggers(line: string): string[] {
    const triggers: string[] = [];
    const regex = /(?:when(?:ever)?[^.]+\.)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      triggers.push(match[0].trim());
    }
    return triggers.length ? triggers : [line];
  }

  private pushTrigger(source: Cart | Permanent, text: string, context = '') {
    this.stack.pushToStack({
      source,
      description: this.gameStorage.replaceManaSymbolsAndHighlightTriggers(text),
      type: 'TriggeredAbility',
    });

    const name = source.name;
    const zone = this.stack.isPermanent(source) ? 'Permanent' : 'Cart';
    this.logService.addLog(`[TriggerService.${context}] Pushed trigger from ${zone} ${name}: ${text}`);
  }
}
