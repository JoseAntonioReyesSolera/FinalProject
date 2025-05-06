import { Injectable } from '@angular/core';
import { Cart } from '../models/cart';
import { BattlefieldService } from './battlefield.service';
import { StackService } from './stack.service';

@Injectable({
  providedIn: 'root'
})
export class TriggerService {
  constructor(
    private readonly stack: StackService,
    private readonly battlefield: BattlefieldService
  ) {}

  // Este método se llama cuando nuevas cartas entran al campo
  handleEnterBattlefield(newPermanents: Cart[]): void {
    const allPermanents = this.battlefield.getCurrentPermanents(); // ya en mesa

    for (const entering of newPermanents) {
      this.checkETBTriggers(entering); // triggers propios

      for (const existing of allPermanents) {
        if (existing.instanceId === entering.instanceId) continue;
        this.checkOtherTriggers(existing, entering); // triggers de otros permanentes
      }
    }
  }

  private checkETBTriggers(card: Cart): void {
    const triggers = card.triggeredAbilities ?? [];

    for (const ability of triggers) {
      const sentence = ability.fullSentence.toLowerCase();
      const triggerType = ability.triggerType.toLowerCase();

      if ((triggerType === 'when' || triggerType === 'as') && sentence.includes('enters')) {
        this.stack.pushToStack({
          source: card,
          effect: ability.fullSentence,
          description: `${card.name} - ETB: ${ability.fullSentence}`,
          resolve: () => this.resolveEffect(ability, card)
        });
      }
    }
  }

  private checkOtherTriggers(observer: Cart, entering: Cart): void {
    const triggers = observer.triggeredAbilities ?? [];

    for (const ability of triggers) {
      const sentence = ability.fullSentence.toLowerCase();
      const triggerType = ability.triggerType.toLowerCase();

      if (
        (triggerType === 'when' || triggerType === 'whenever') &&
        sentence.includes('enters') &&
        sentence.includes('creature') &&
        this.isCreature(entering)
      ) {
        this.stack.pushToStack({
          source: observer,
          effect: ability.fullSentence,
          description: `${observer.name} - Triggered by ${entering.name}`,
          resolve: () => this.resolveEffect(ability, observer, entering)
        });
      }
    }
  }

  private isCreature(card: Cart): boolean {
    return (card.type_line ?? '').toLowerCase().includes('creature');
  }

  private resolveEffect(ability: any, source: Cart, target?: Cart): void {
    console.log(`Resolviendo efecto de ${source.name}: ${ability.fullSentence}`);
    // Aquí puedes implementar efectos personalizados más adelante
  }
}
