import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';

@Injectable({ providedIn: 'root' })
export class BattlefieldService {
  private readonly permanentsSubject = new BehaviorSubject<Permanent[]>([]);
  readonly permanents$: Observable<Permanent[]> = this.permanentsSubject.asObservable();

  /** Añade uno o varios permanentes basados en un Cart */
  addPermanent(card: Cart, count: number = 1): void {
    const current = this.permanentsSubject.getValue();
    const newOnes: Permanent[] = [];
    for (let i = 0; i < count; i++) {
      newOnes.push({
        instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36)}`,
        cardId: card.id,
        name: card.name,
        image: card.image_uris?.art_crop ?? card.image_uris?.normal ?? '',
        power: card.power,
        toughness: card.toughness,
        tapped: false,
        counters: {},
        oracle_text: card.sanitizedOracleText,
        type: card.type_line,
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

  updatePermanent(updated: Permanent): void {
    const list = this.permanentsSubject.getValue();
    const idx = list.findIndex(p => p.instanceId === updated.instanceId);
    if (idx === -1) return;
    const copy = [...list];
    copy[idx] = updated;
    this.permanentsSubject.next(copy);
  }

  clearBattlefield(): void {
    this.permanentsSubject.next([]);
  }
}
