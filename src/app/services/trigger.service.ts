import { Injectable } from '@angular/core';
import { StackService } from './stack.service';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';
import {LogService} from './log.service';

@Injectable({ providedIn: 'root' })
export class TriggerService {
  constructor(private readonly stack: StackService, private readonly logService: LogService) {}

  detectZoneChangeTriggers(card: Cart, from: string, to: string) {
    const oracle = (card.oracle_text || '').toString();
    const baseName = card.name.split(',')[0].toLowerCase();

    const etbEffect = to === 'battlefield'
      ? this.hasETBAbility(oracle, baseName)
      : null;

    const ltbEffect = from === 'battlefield'
      ? this.hasLeavesTrigger(oracle, baseName)
      : null;

    const dieEffect = from === 'battlefield' && to === 'graveyard'
      ? this.hasDiesTrigger(oracle, baseName)
      : null;

    // ETB = enters the battlefield
    if (etbEffect) {
      this.logService.addLog("[TriggerService.detectZoneChangeTriggers] ", card.name, " enter the battlefield");
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: `triggers an ETB ability:`,
        efecto: etbEffect
      });
    }

    // Dies = from battlefield to graveyard
    if (dieEffect) {
      this.logService.addLog("[TriggerService.detectZoneChangeTriggers] ", card.name, " enter the graveyard");
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: `triggers dies:`,
        efecto: dieEffect
      });
    }

    // Leaves battlefield = battlefield to any other zone
    if (ltbEffect) {
      this.logService.addLog("[TriggerService.detectZoneChangeTriggers] ", card.name, " leave the battlefield");
      this.stack.pushToStack({
        type: 'TriggeredAbility',
        source: card,
        description: `trigger leaves the battlefield:`,
        efecto: ltbEffect
      });
    }
  }

  private hasETBAbility(oracle: string, cardName: string): string | null {
    const lines = oracle.split('\n');
    const pattern = new RegExp(`^when .* enters`, 'i');
    return lines.find(line => pattern.test(line.trim()))?.trim() ?? null;
  }

  private hasDiesTrigger(oracle: string, cardName: string): string | null {
    const lines = oracle.split('\n');
    const pattern = new RegExp(`^when .* dies`, 'i');
    return lines.find(line => pattern.test(line.trim()))?.trim() ?? null;
  }

  private hasLeavesTrigger(oracle: string, cardName: string): string | null {
    const lines = oracle.split('\n');
    const pattern = new RegExp(`^when .* leaves the battlefield`, 'i');
    return lines.find(line => pattern.test(line.trim()))?.trim() ?? null;
  }

  detectBattlefieldTriggers(
    event: "enters" | "dies" | "leaves",
    affected: Permanent | Permanent[] | undefined,
    otherPermanents: Permanent[]
  ): void {
    this.logService.addLog("[TriggerService.detectBattlefieldTriggers] ", "caused a trigger?");
    switch (event) {
      case 'enters':
        this.checkEntryTriggers(affected as unknown as Permanent[], otherPermanents);
        break;
      case 'dies':
        this.checkDiesTriggers(affected as Permanent, otherPermanents);
        break;
      case 'leaves':
        this.checkLeavesTriggers(affected as Permanent | undefined, otherPermanents);
        break;
    }
  }

  private checkEntryTriggers(entered: Permanent[], before: Permanent[]) {
    // Prepara un array con los tipos de los entrantes en minúsculas
    const enteredTypes = entered.map(e => e.type.toLowerCase());

    for (const permanent of before) {
      const oracle = permanent.originalCard.oracle_text;

      // 1) Toma todas las líneas que contengan "whenever" y "enters"
      const lines = oracle.split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) =>
          /(?:—\s*)?whenever .* enters(?: the battlefield)?/i.test(l)
        );

      for (const triggerText of lines) {
        // 2) Extrae lo que entra: captura el fragmento entre "whenever" y "enters"
        const match = /whenever\s+(.+?)\s+enters/i.exec(triggerText);
        if (!match) continue;
        const subjectPhrase = match[1].toLowerCase();
        // 3) Si es genérico "permanent", dispara siempre
        if (subjectPhrase.includes('permanent')) {
          this.pushTrigger(permanent, triggerText);
          continue;
        }

        // 4) Para otras frases, verifica si alguno de los entrantes coincide por tipo
        //    Tomamos la palabra clave más significativa:
        const keyword = subjectPhrase
          .replace(/you control/g, '')
          .replace(/another /g, '')
          .trim()
          .split(' ')
          .slice(-1)[0];
        // 5) Si alguno de los tipos de los entrantes incluye esa palabra clave:
        if (enteredTypes.some(t => t.includes(keyword))) {
          this.pushTrigger(permanent, triggerText);
        }
      }
    }
  }

  private checkDiesTriggers(died: Permanent, remaining: Permanent[]) {
    // Prepara el tipo del permanente que murió, en minúsculas
    const diedType = died.type.toLowerCase();

    for (const permanent of remaining) {
      const oracle = permanent.originalCard.oracle_text.toLowerCase();

      // 1) Filtra líneas que contengan "whenever ... dies"
      const lines = oracle
        .split('\n')
        .map(l => l.trim())
        .filter(l => /^whenever (?:another )?.+ dies/i.test(l));

      for (const triggerText of lines) {
        // 2) Extrae el sujeto que muere (entre "whenever" y "dies")
        const match = /^whenever (?:another )?(.+?) dies/i.exec(triggerText);
        if (!match) continue;

        const subjectPhrase = match[1].toLowerCase().trim();
        // 3) Si es genérico "permanent", dispara siempre
        if (subjectPhrase.includes('permanent')) {
          this.pushTrigger(permanent, triggerText);
          continue;
        }

        // 4) Extrae la palabra clave principal
        const keyword = subjectPhrase
          .replace(/you control/gi, '')
          .replace(/another /gi, '')
          .replace(/a |an /gi, '')
          .trim()
          .split(' ')
          .pop()!;
        // 5) Si el tipo del muerto coincide con la keyword, dispara
        if (diedType.includes(keyword)) {
          this.pushTrigger(permanent, triggerText);
        }
      }
    }
  }

  private checkLeavesTriggers(leaving: Permanent | undefined, remaining: Permanent[]) {

    for (const permanent of remaining) {
      const oracle = permanent.originalCard.oracle_text;

      const lines = oracle
        .split('\n')
        .map(l => l.trim())
        .filter(l => /whenever one or more.*leave the battlefield(?!.*dies)/i.test(l));

      for (const triggerText of lines) {
        const match = /whenever one or more (.+?) leave the battlefield/i.exec(triggerText);
        if (!match) continue;

        this.pushTrigger(permanent, triggerText);
      }
    }
  }

  private pushTrigger(source: Permanent, triggerText: string) {
    this.stack.pushToStack({
      type: 'TriggeredAbility',
      source,
      description: `${source.name} triggers:`,
      efecto: triggerText.trim(),
    });
  }
}
