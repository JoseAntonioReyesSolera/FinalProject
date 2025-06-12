import { Injectable } from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';
import {TriggerService} from './trigger.service';
import {LogService} from './log.service';

@Injectable({ providedIn: 'root' })
export class BattlefieldService {
  private readonly permanentsSubject = new BehaviorSubject<Permanent[]>([]);
  readonly permanents$: Observable<Permanent[]> = this.permanentsSubject.asObservable();

  constructor(private readonly triggerService: TriggerService, private readonly logService: LogService) {
  }

  /** Añade uno o varios permanentes basados en un Cart */
  addPermanent(card: Cart, count: number = 1, fromZone = ''): void {
    const current = this.permanentsSubject.getValue();
    const newOnes: Permanent[] = [];
    const entersTapped =  /this [\w\s]+ enters tapped/i.test(card.oracle_text ?? '');

    for (let i = 0; i < count; i++) {
      const instanceId = `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      newOnes.push({
        instanceId,
        cardId: card.id,
        name: card.name,
        image: card.image_uris?.art_crop ?? card.image_uris?.normal ?? '',
        power: card.power,
        toughness: card.toughness,
        loyalty: card.loyalty,
        tapped: entersTapped,
        counters: [],
        oracle_text: card.sanitizedOracleText,
        type: card.type_line,
        originalCard: card,
      });
    }

    this.permanentsSubject.next([...current, ...newOnes]);
    this.logService.addLog("[BattlefieldService.addPermanent] ", card.name, " enter the battlefield");
    // "Whenever" triggers on existing permanents:
      this.triggerService.detectTriggers('enters', this.getPermanentsSnapshot(), { source: newOnes[0] })
  }

  removePermanent(instanceId: string, toZone: string = ''): void {
    const before = this.permanentsSubject.getValue();
    const died = before.find(p => p.instanceId === instanceId)!;

    // Solo considera "muerte" si va al cementerio
    if (toZone === 'graveyard') {
      this.logService.addLog('[Battlefield.removePermanent.died] dies →', died.name);

      // Verificar triggers ANTES de remover, usando el estado actual (before)
      this.triggerService.detectTriggers('dies', before, {
        source: died,
        // No necesitas pasar abilityHolder aquí, ya que detectTriggers lo manejará
      });

      // Luego remover el permanente
      const after = before.filter(p => p.instanceId !== instanceId);
      this.permanentsSubject.next(after);
    } else {
      this.logService.addLog('[Battlefield.removePermanent.leave] leaves →', died.name);
      this.triggerService.detectTriggers('leaves', before, { source: died });

      const after = before.filter(p => p.instanceId !== instanceId);
      this.permanentsSubject.next(after);
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

  untapAll(): void {
    const updated = this.getPermanentsSnapshot().map(p => ({ ...p, tapped: false }));
    this.permanentsSubject.next(updated);
    this.logService.addLog('[BattlefieldService.untapAll]', 'All permanents untapped');
  }

  getGlobalPowerToughnessBuffs(target: Permanent): { power: number; toughness: number } {
    let bonus = { power: 0, toughness: 0 };
    const permanents = this.getPermanentsSnapshot();

    for (const permanent of permanents) {
      const text = permanent.originalCard?.oracle_text?.toLowerCase() || '';

      // Patrón para detectar lords tribales: "Other Zombie creatures you control get +1/+1"
      const tribalMatch = RegExp(/(other )?([a-z]+) creatures you control get \+(\d+)\/\+(\d+)/).exec(text);
      if (tribalMatch) {
        const [ , other, type, pow, tough ] = tribalMatch;
        const appliesToSelf = !other; // solo se aplica a sí mismo si NO contiene "other"
        const creatureType = type.charAt(0).toUpperCase() + type.slice(1); // capitalizar

        // Verificamos si el target tiene ese tipo de criatura
        if (target.type?.includes(creatureType)) {
          if (appliesToSelf || target.instanceId !== permanent.instanceId) {
            bonus.power += parseInt(pow);
            bonus.toughness += parseInt(tough);
          }
        }

        continue; // evita que entre en el siguiente if
      }

      // Global buffs tipo "Creatures you control get +1/+1"
      if (text.includes('creatures you control get +1/+1')) {
        bonus.power += 1;
        bonus.toughness += 1;
      }
    }

    return bonus;
  }
}
