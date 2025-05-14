import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Cart } from '../models/cart';
import { Permanent } from '../models/permanent';
import {StackService} from './stack.service';

@Injectable({ providedIn: 'root' })
export class BattlefieldService {
  private readonly permanentsSubject = new BehaviorSubject<Permanent[]>([]);
  readonly permanents$: Observable<Permanent[]> = this.permanentsSubject.asObservable();

  constructor(private readonly stack: StackService) {}

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
    this.checkEntryTriggers(newOnes, newOnes);
  }

  removePermanent(instanceId: string): void {
    const before = this.permanentsSubject.getValue();
    const died = before.find(p => p.instanceId === instanceId);
    const after = before.filter(p => p.instanceId !== instanceId);
    this.permanentsSubject.next(after);

    if (died) {
      this.checkDiesTriggers(died, after);
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
    this.permanentsSubject.next([...permanents]);
  }

  private checkEntryTriggers(entered: Permanent[], before: Permanent[]) {
    const enteredTypes = entered.map(e => e.type.toLowerCase());

    for (const permanent of before) {
      const oracle = permanent.oracle_text.toLowerCase();
      const lines = oracle
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) =>
          /(?:landfall\s*—\s*)?whenever .* enters(?: the battlefield)?/i.test(l)
        );

      for (const triggerText of lines) {
        // Extrae el sujeto que entra
        const match = /whenever\s+(.+?)\s+enters/i.exec(triggerText);
        if (!match) continue;
        const subject = match[1].toLowerCase();
        // e.g. "another creature you control" o "a land you control"

        // Si es genérico "permanent"
        if (subject.includes('permanent')) {
          this.pushTrigger(permanent, triggerText);
          continue;
        }

        // Extraemos la palabra clave final ("creature", "land", "artifact", …)
        const keyword = subject
          .replace(/you control|another|a|an/gi, '')
          .trim()
          .split(' ')
          .pop()!;

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
        // e.g. "another creature you control", "an artifact", "a nontoken creature", etc.

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
        // Ej.: "creature", "artifact", "enchantment", etc.

        // 5) Si el tipo del muerto coincide con la keyword, dispara
        if (diedType.includes(keyword)) {
          this.pushTrigger(permanent, triggerText);
        }
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
