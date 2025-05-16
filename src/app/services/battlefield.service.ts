import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';
import {StackService} from './stack.service';
import {TriggerService} from './trigger.service';
import {LogService} from './log.service';

@Injectable({ providedIn: 'root' })
export class BattlefieldService {
  private readonly permanentsSubject = new BehaviorSubject<Permanent[]>([]);
  readonly permanents$: Observable<Permanent[]> = this.permanentsSubject.asObservable();

  constructor(private readonly stack: StackService, private readonly triggerService: TriggerService, private readonly logService: LogService) {
  }

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
        loyalty: card.loyalty,
        tapped: false,
        counters: {},
        oracle_text: card.sanitizedOracleText,
        type: card.type_line,
        originalCard: card,
      });
    }
    this.permanentsSubject.next([...current, ...newOnes]);
    this.logService.addLog("[BattlefieldService.addPermanent] ", card.name, " enter the battlefield");
    this.triggerService.detectBattlefieldTriggers("enters", newOnes, current);
  }

  removePermanent(instanceId: string, destinationZone: string = ''): void {
    const before = this.permanentsSubject.getValue();
    const died = before.find(p => p.instanceId === instanceId);
    const after = before.filter(p => p.instanceId !== instanceId);
    this.permanentsSubject.next(after);

    // Solo considera "muerte" si va al cementerio
    if (died && destinationZone === 'graveyard') {
      this.logService.addLog("[BattlefieldService.removePermanent] ", died.name, " enter the graveyard");
      this.triggerService.detectBattlefieldTriggers("dies", died, before);
    }
    else {
      this.logService.addLog("[BattlefieldService.removePermanent] ", died?.name, " leave the battlefield");
      this.triggerService.detectBattlefieldTriggers('leaves', died, before);
    }
  }


  getPermanentsSnapshot(): Permanent[] {
    return this.permanentsSubject.getValue();
  }

  setPermanentsFromSnapshot(permanents: Permanent[]): void {
    this.permanentsSubject.next([...permanents]);
  }


  transformPermanent(instanceId: string): void {
    const permanents = this.getPermanentsSnapshot();
    const index = permanents.findIndex(p => p.instanceId === instanceId);

    if (index === -1) return;

    const current = permanents[index];
    const card = current.originalCard;

    // Asegúrate de que es una carta transformable
    if (!card.card_faces || card.card_faces.length < 2) return;

    const isFront = current.name === card.card_faces[0].name;
    const newFace = isFront ? card.card_faces[1] : card.card_faces[0];

    const newPermanent: Permanent = {
      instanceId: `${card.id}-${Date.now()}-${Math.random().toString(36)}`,
      cardId: card.id,
      name: newFace.name,
      image: newFace.image_uris?.art_crop ?? newFace.image_uris?.normal ?? '',
      power: newFace.power,
      toughness: newFace.toughness,
      loyalty: newFace.loyalty,
      tapped: current.tapped,
      counters: {...current.counters},
      oracle_text: newFace.oracle_text,
      type: newFace.type_line,
      originalCard: card,
    };

    // Sustituir el permanente
    permanents.splice(index, 1, newPermanent);
    this.logService.addLog("[BattlefieldService.transformPermanent]", "card flipped ", current.name, "to ", newPermanent.name);
    this.permanentsSubject.next([...permanents]);
  }
}
