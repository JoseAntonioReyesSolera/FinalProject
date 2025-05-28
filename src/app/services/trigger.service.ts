import {Cart} from '../models/cart';
import {Permanent} from '../models/permanent';
import {Injectable} from '@angular/core';
import {StackService} from './stack.service';
import {LogService} from './log.service';
import {GameStorageService} from './game-storage.service';

type TriggerEvent =
  | 'cast'
  | 'enters'
  | 'dies'
  | 'leaves'
  | 'draw'
  | 'discard'
  | 'attack'
  | 'beginStep'
  | 'endStep';

interface TriggerPattern {
  includes: string[];
  startsWith?: string;
  extraCondition?: (line: string, context?: { source?: Cart | Permanent; stepName?: string }) => boolean;
}

@Injectable({ providedIn: 'root' })
export class TriggerService {
  constructor(
    private readonly stack: StackService,
    private readonly logService: LogService,
    private readonly gameStorage: GameStorageService
  ) {}

  private readonly triggerPatterns: Record<TriggerEvent, TriggerPattern> = {
    cast: {
      includes: ['whenever you cast'],
      extraCondition: (line, ctx) => {
        // “Whenever you cast a historic spell…”
        if (line.includes('historic spell')) {
          const src = ctx?.source as Cart;
          return src ? this.isHistoric(src) : false;
        }
        return true;
      }
    },
    enters: {
        // Solo requerimos 'enters'; el cuándo lo validamos abajo
      includes: ['enters'],
      extraCondition: (line, ctx) => {
        // 1) Landfall (no empieza con 'when' ni 'whenever')
        if (line.startsWith('landfall')) {
          const src = ctx?.source as Permanent;
          return !!src && src.originalCard.type_line.toLowerCase().includes('land');
        }
        // 2) Para el resto, solo líneas que empiecen con 'when ' o 'whenever '
        return line.startsWith('when ') || line.startsWith('whenever ');
      }
    },
    dies: {
      includes: ['dies', ' is put into a graveyard from the battlefield'],
      extraCondition: (line, ctx) => {
        // ctx.source es la criatura que acaba de morir
        const src = ctx?.source as Permanent;
        if (!src) return false;

        // Buscar subtipo en formato "another X" o "this X"
        const m = line.match(/\b(?:this|another)\s+([a-z]+)\b/);
        if (m) {
          const subtype = m[1].toLowerCase();
          // Solo disparamos si el type_line contiene ese subtipo
          return src.originalCard.type_line.toLowerCase().includes(subtype);
        }
        // Si no se ajusta al formato “another X” o “this X”, dejamos pasar
        return true;
      }
    },
    leaves: {
      includes: ['leaves'],
      extraCondition: (line, ctx) => {
        // 1) “when [this creature] leaves…”
        if (line.startsWith('when ')) {
          // solo dispara si la fuente es la que se va
          const src = ctx?.source as Permanent;
          return !!src && line.includes(src.name.toLowerCase());
        }
        // 2) “whenever … leaves…” para cualquiera
        return line.startsWith('whenever ');
      }
    },
    draw: {
      includes: ['whenever you draw a card'],
    },
    discard: {
      includes: ['whenever you discard a'],
      extraCondition: (line, ctx) => {
        // Asegurarse de que la carta descartada es criatura
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
        // upkeep
        if (line.includes('at the beginning of your upkeep')) {
          return s === 'upkeep';
        }
        // combat
        if (line.includes('at the beginning of combat on your turn')) {
          return s === 'beginning of combat';
        }
        // otras fases siguen disparando normalmente
        return !/(upkeep|combat)/.test(line);
      }
    },
    endStep: {
      includes: ['at the beginning of the end step'],
    },
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

      // 1) disparadores “when you cast this spell” en la propia carta
      this.extractOracleLines(spell)
        .filter(line => line.startsWith('when you cast'))
        .forEach(line =>
          this.pushTrigger(spell, line, `detectTriggers.cast.self`)
        );

      // 2) disparadores “whenever you cast…” en permanentes en mesa
      battlefield.forEach(perm => {
        this.extractOracleLines(perm.originalCard)
          .filter(line => line.includes('whenever') && line.includes('cast'))
          .forEach(line => {
            // aplicamos extraCondition para histórico si hace falta
            const ok = pattern.extraCondition ? pattern.extraCondition(line, options) : true;
            if (ok) {
              this.pushTrigger(perm, line, `detectTriggers.cast.other`);
            }
          });
      });
      return;
    }

    if ((event === 'dies' || event === 'leaves') && options?.source) {
      this.checkSelfTriggers(event, options.source, pattern, `detectTriggers.${event}.self`);
    }

    (battlefield).forEach(entity => {
      const card = this.stack.isPermanent(entity) ? entity.originalCard : entity;
      this.extractOracleLines(card).forEach(line => {
        const matchesInc = pattern.includes.some(substr => line.includes(substr));
        const matchesStart = pattern.startsWith ? line.startsWith(pattern.startsWith) : true;
        const extraOk = pattern.extraCondition
          ? pattern.extraCondition(line, { source: options?.source, stepName: options?.stepName })
          : true;

        if (matchesInc && matchesStart && extraOk) {
          // Caso especial para 'enters':
          if (event === 'enters' && line.startsWith('when ')) {
            // Líneas "when X enters..." solo para el propio X:
            const src = options?.source as Permanent;
            // si entity !== src, no disparamos
            if (entity !== src) return;
          }
          this.pushTrigger(entity, line, `detectTriggers.${event}`);
          }
      });
    });
  }

  // Utilidades

  private checkSelfTriggers(event: TriggerEvent, source: Cart | Permanent, pattern: TriggerPattern, context: string) {
    const lines = this.extractOracleLines(this.stack.isPermanent(source) ? source.originalCard : source);
    lines.forEach(line => {
      const matchesInc = pattern.includes.some(substr => line.includes(substr));
      const matchesStart = pattern.startsWith ? line.startsWith(pattern.startsWith) : true;
      const extraOk = pattern.extraCondition
        ? pattern.extraCondition(line, { source })
        : true;
      if (matchesInc && matchesStart && extraOk) {
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
      description: this.gameStorage['sanitizeHtml'](
        this.gameStorage['replaceManaSymbolsAndHighlightTriggers'](text)
      ),
      type: 'TriggeredAbility',
    });

    const name = source.name;
    const zone = this.stack.isPermanent(source) ? 'Permanent' : 'Cart';
    this.logService.addLog(`[TriggerService.${context}] Pushed trigger from ${zone} ${name}: ${text}`);
  }

  reorderTriggers(newOrder: number[]): void {
    const current = this.stack.getCurrentStackSnapshot();
    const reordered = newOrder.map(i => current[i]).filter(x => !!x);
    this.stack.setStackFromSnapshot(reordered);
  }

  private isHistoric(card: Cart): boolean {
    const typeLine = card.type_line.toLowerCase();
    return typeLine.includes('artifact') || typeLine.includes('legendary') || typeLine.includes('saga');
  }

}
