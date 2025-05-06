import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';
import {TriggeredAbility, TriggerType} from '../models/triggered-ability';

@Injectable({ providedIn: 'root' })
export class BattlefieldService {
  private readonly permanentsSubject = new BehaviorSubject<Permanent[]>([]);
  readonly permanents$: Observable<Permanent[]> = this.permanentsSubject.asObservable();

  /** Añade uno o varios permanentes basados en un Cart */
  addPermanent(card: Cart, count: number = 1): void {
    const current = this.permanentsSubject.getValue();
    const newOnes: Permanent[] = [];
    const triggered = this.extractTriggeredAbilities(card.oracle_text);

    for (let i = 0; i < count; i++) {
      newOnes.push({
        instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36)}`,
        cardId: card.id,
        name: card.name,
        image: card.image_uris?.art_crop ?? card.image_uris?.normal ?? '',
        power: card.power,
        toughness: card.toughness,
        loyalty: card.loyalty,
        tapped: false,
        counters: {},
        oracle_text: card.sanitizedOracleText,
        type: card.type_line,
        originalCard: card,
        triggeredAbilities: triggered,
      });
    }
    this.permanentsSubject.next([...current, ...newOnes]);

    console.log(this.permanentsSubject.getValue());
  }

  removePermanent(instanceId: string): void {
    const filtered = this.permanentsSubject.getValue()
      .filter(p => p.instanceId !== instanceId);
    this.permanentsSubject.next(filtered);
  }

  private extractTriggeredAbilities(rawText: string): TriggeredAbility[] {
    if (!rawText) return [];

    // 1) Quita saltos de línea y dobles espacios
    const text = rawText.replace(/\s+/g, ' ').trim();

    // 2) Fracciona en oraciones
    const sentences = text
      .split('.')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const result: TriggeredAbility[] = [];

    for (const s of sentences) {
      // When / Whenever / At
      const m = s.match(/^(When|Whenever|At)\b/i);
      if (m) {
        result.push({
          triggerType: m[1] as TriggerType,
          fullSentence: s + '.',
        });
      }
    }

    return result;
  }

  getCurrentPermanents(): Permanent[] {
    return this.permanentsSubject.getValue();
  }

}
