import {Cart} from '../models/cart';
import {Permanent} from '../models/permanent';
import {Injectable} from '@angular/core';
import {StackService} from './stack.service';
import {LogService} from './log.service';
import {CardEnrichmentService} from './enrich.service';

type TriggerEvent =
  | 'cast'
  | 'enters'
  | 'dies'
  | 'leaves'
  | 'draw'
  | 'discard'
  | 'attack'
  | 'beginStep'
  | 'attackDeclare';

interface TriggerPattern {
  includes: string[];
  startsWith?: string;
  extraCondition?: (line: string, context?: {
    source?: Cart | Permanent; // Quién causó el evento
    stepName?: string;
    abilityHolder?: Cart | Permanent;  // Quién tiene la habilidad
  }) => boolean;
}

@Injectable({ providedIn: 'root' })
export class TriggerService {
  constructor(
    private readonly stack: StackService,
    private readonly logService: LogService,
    private readonly enrichService: CardEnrichmentService
  ) {}

  private readonly triggerPatterns: Record<TriggerEvent, TriggerPattern> = {
    cast: {
      includes: ['whenever you cast'],
      extraCondition: (line, ctx) => {
        if (line.includes('historic spell')) {
          const src = ctx?.source as Cart;
          return src ? this.isHistoric(src) : false;
        }
        return true;
      }
    },
    enters: {
      includes: ['enters'],
      extraCondition: (line, ctx) => {
        const src = ctx?.source as Permanent;
        const abilityHolder = ctx?.abilityHolder as Permanent;

        // Handle "this" keyword - only match if source is the ability holder
        if (/\bthis\b/.test(line)) {
          return abilityHolder === src;
        }

        // Handle landfall
        const isLandfall = line.includes('landfall') && line.includes('enters');
        if (isLandfall) {
          return !!src && src.originalCard.type_line.toLowerCase().includes('land');
        }

        // Must start with "when" or "whenever"
        const startsCorrectly = line.startsWith('when ') || line.startsWith('whenever ');
        if (!startsCorrectly) return false;

        // Handle cases like "whenever an artifact enters"
        if (line.includes('an artifact enters') || line.includes('a artifact enters')) {
          return !!src && src.originalCard.type_line.toLowerCase().includes('artifact');
        }

        // Handle general cases with specific types
        const typeMatch = RegExp(/\b(?:an?|another|this|that)\s+([a-z\s]+?)\s+enters/).exec(line);
        if (typeMatch) {
          const requiredType = typeMatch[1].toLowerCase().trim();
          return !!src && src.originalCard.type_line.toLowerCase().includes(requiredType);
        }

        return true;
      }
    },
    // En la definición de los patrones:
    dies: {
      includes: ['dies', 'is put into a graveyard from the battlefield'],
      extraCondition: (line, ctx) => {
        const src = ctx?.source as Permanent;
        const abilityHolder = ctx?.abilityHolder as Permanent;

        if (!src) return false;

        // 0. CASO ESPECIAL PRIMERO: "whenever this creature or another creature dies"
        if (/this creature or another creature dies/i.test(line)) {
          return src.originalCard.type_line?.toLowerCase().includes('creature') || false;
        }

        // 1. Si la habilidad menciona "this", debe ser la misma carta
        if (line.includes('this') && abilityHolder !== src) {
          return false;
        }

        // 2. Si la habilidad menciona "another", no debe ser la misma carta
        if (line.includes('another') && abilityHolder === src) {
          return false;
        }

        // 3. Verificar tipos específicos si se mencionan
        const typeMatch = RegExp(/\b(?:an?|another|this)\s+([a-z]+)\b/).exec(line);
        if (typeMatch) {
          const requiredType = typeMatch[1];
          return src.originalCard.type_line?.toLowerCase().includes(requiredType) || false;
        }

        return true;
      }
    },
    leaves: {
      includes: ['leaves'],
      extraCondition: (line, ctx) => {
        const src = ctx?.source as Permanent;
        const abilityHolder = ctx?.abilityHolder as Permanent;

        // Handle "this" keyword
        if (/\bthis\b/.test(line)) {
          return abilityHolder === src;
        }

        if (!src) return false;

        if (line.startsWith('when ')) {
          return line.includes('this ') || line.includes(src.name.toLowerCase());
        }
        return line.startsWith('whenever ');
      }
    },
    draw: {
      includes: ['whenever you draw a card'],
    },
    discard: {
      includes: ['whenever you discard a'],
      extraCondition: (_line, ctx) => {
        const src = ctx?.source as Cart;
        return !!src && src.type_line.toLowerCase().includes('creature');
      }
    },
    attack: {
      includes: ['whenever you attack'],
    },
    beginStep: {
      includes: ['at the beginning of'],
      extraCondition: (line, ctx) => {
        const s = ctx?.stepName?.toLowerCase();
        if (!s) return false;

        const stepMapping: Record<string, RegExp> = {
          upkeep: /upkeep\b/i,
          'beginning of combat': /\b(combat(?! damage)|beginning of combat\b)/i,
          'end step': /end step\b/i,
          draw: /draw step\b/i,
          'precombat main phase': /(pre-?combat main|first main) phase\b/i,
          'postcombat main phase': /(post-?combat main|second main) phase\b/i,
          'combat damage': /combat damage step\b/i
        };

        for (const [step, regex] of Object.entries(stepMapping)) {
          if (s.includes(step) && regex.test(line)) return true;
        }
        return false;
      }
    },
    attackDeclare: {
      includes: ['attacks'],
      extraCondition: (line, ctx) => {
        if (!ctx?.source) return false;
        const perm = ctx.source as Permanent;
        const escapedName = perm.name.split(',')[0].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b(this|that|${escapedName})\\s+attacks\\b`, 'i');
        return regex.test(line);
      },
    }
  };

  detectTriggers(
    event: TriggerEvent,
    battlefield: Permanent[],
    options?: {
      source?: Cart | Permanent;
      context?: string;
      stepName?: string;
    }
  ) {
    const pattern = this.triggerPatterns[event];

    if (event === 'cast' && options?.source) {
      const spell = options.source as Cart;

      // 1) Self triggers "when you cast this spell"
      this.extractOracleLines(spell)
        .filter(line => line.startsWith('when you cast'))
        .forEach(line =>
          this.pushTrigger(spell, line, `detectTriggers.cast.self`)
        );

      // 2) Battlefield triggers "whenever you cast..."
      battlefield.forEach(perm => {
        this.extractOracleLines(perm.originalCard)
          .filter(line => line.includes('whenever') && line.includes('cast'))
          .forEach(line => {
            const ok = pattern.extraCondition ?
              pattern.extraCondition(line, {
                source: spell,
                abilityHolder: perm  // Pasar el portador de la habilidad
              }) : true;
            if (ok) {
              this.pushTrigger(perm, line, `detectTriggers.cast.other`);
            }
          });
      });
      return;
    }

    if (event === 'attackDeclare' && options?.source) {
      const perm = options.source as Permanent;
      this.extractOracleLines(perm.originalCard)
        .filter(line => pattern.extraCondition?.(line, {
          source: perm,
          abilityHolder: perm  // Pasar el portador de la habilidad
        }) ?? false)
        .forEach(line =>
          this.pushTrigger(perm, line, 'detectTriggers.attackDeclare')
        );
      return;
    }

    if (event === 'dies' && options?.source) {
      const dyingPermanent = options.source as Permanent;

      // 1. Verificar triggers en el permanente que muere
      this.checkSelfTriggers('dies', dyingPermanent, this.triggerPatterns.dies, 'detectTriggers.dies.self');

      // 2. Verificar triggers en otros permanentes
      battlefield.forEach(permanent => {
        if (permanent === dyingPermanent) return;

        this.extractOracleLines(permanent.originalCard)
          .filter(line => line.includes('dies'))
          .forEach(line => {
            const shouldTrigger = this.triggerPatterns.dies.extraCondition?.(line, {
              source: dyingPermanent,
              abilityHolder: permanent
            }) ?? true;

            if (shouldTrigger) {
              this.pushTrigger(permanent, line, 'detectTriggers.dies.other');
            }
          });
      });
      return;
    }

    battlefield.forEach(entity => {
      const card = this.stack.isPermanent(entity) ? entity.originalCard : entity;
      this.extractOracleLines(card).forEach(line => {
        const context = {
          source: options?.source,
          stepName: options?.stepName,
          abilityHolder: entity  // Pasar el portador de la habilidad
        };

        if (this.matchesTriggerPattern(line, pattern, context)) {
          if (event === 'enters') {
            if (line.includes('another') && entity === options?.source) {
              return;
            }
          }
          this.pushTrigger(entity, line, `detectTriggers.${event}`);
        }
      });
    });
  }

  // Helper to centralize pattern matching logic
  private matchesTriggerPattern(
    line: string,
    pattern: TriggerPattern,
    context?: any
  ): boolean {
    const matchesInc = pattern.includes.some(substr => line.includes(substr));
    const matchesStart = pattern.startsWith ? line.startsWith(pattern.startsWith) : true;
    const extraOk = pattern.extraCondition ?
      pattern.extraCondition(line, context) : true;
    return matchesInc && matchesStart && extraOk;
  }

  // Utilidades

  private checkSelfTriggers(
    _event: TriggerEvent,
    source: Cart | Permanent,
    pattern: TriggerPattern,
    context: string
  ) {
    const lines = this.extractOracleLines(
      this.stack.isPermanent(source) ? source.originalCard : source
    );

    lines.forEach(line => {
      const ctx = {
        source,
        abilityHolder: source  // Pasar el portador de la habilidad
      };
      if (this.matchesTriggerPattern(line, pattern, ctx)) {
        this.pushTrigger(source, line, context);
      }
    });
  }

  private extractOracleLines(card: Cart): string[] {
    return (card?.oracle_text || '')
      .toLowerCase()
      .split('\n')
      .map(l => l.trim());
  }

  private pushTrigger(source: Cart | Permanent, text: string, context = '') {
    this.stack.pushToStack({
      source,
      description: this.enrichService['sanitizeHtml'](
        this.enrichService['replaceManaSymbolsAndHighlightTriggers'](text)
      ),
      type: 'TriggeredAbility',
    });

    const name = source.name;
    const zone = this.stack.isPermanent(source) ? 'Permanent' : 'Cart';
    this.logService.addLog(`[TriggerService.${context}] Trigger from ${zone} ${name}: ${text}`);
  }

  reorderTriggers(newOrder: number[]): void {
    const current = this.stack.getCurrentStackSnapshot();
    const reordered = newOrder.map(i => current[i]).filter(x => !!x);
    this.stack.setStackFromSnapshot(reordered);
  }

  private isHistoric(card: Cart): boolean {
    const typeLine = card.type_line.toLowerCase();
    return typeLine.includes('artifact') ||
      typeLine.includes('legendary') ||
      typeLine.includes('saga');
  }
}
