import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {Permanent} from '../../models/permanent';
import {StackItem} from '../../models/stack-item';
import {StackService} from '../../services/stack.service';

@Component({
  selector: 'app-permanent-card',
  templateUrl: './permanent-card.component.html',
  imports: [
  ],
  styleUrls: ['./permanent-card.component.css']
})
export class PermanentCardComponent {
  @Input() card!: Permanent;
  @Output() contextMenu = new EventEmitter<{ event: MouseEvent; card: Permanent }>();
  @Output() cardAction = new EventEmitter<{ action: string; card: Permanent }>();

  contextMenuVisible = false;
  subMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };

  selectedCard: Permanent | null = null;
  pendingAction: 'destroy' | 'backToHand' | 'exile' | null = null;

  constructor(
    private readonly stackService: StackService
  ) {}

  onClick(event: MouseEvent) {
    event.preventDefault();
    const x = event instanceof MouseEvent ? event.clientX - 450 : 100;
    const y = event instanceof MouseEvent ? event.clientY - 75 : 100;
    this.contextMenuVisible = true;
    this.subMenuVisible = false;
    this.contextMenuPosition = { x,y};
    this.selectedCard = this.card;
  }

  executeAction(action: 'cast' | 'details' | 'destroy' | 'backToHand' | 'exile' | 'activate', cost?: string) {
    if (!this.selectedCard) return;

    if (['destroy', 'backToHand', 'exile'].includes(action) && this.selectedCard.originalCard?.isCommander) {
      this.pendingAction = action as 'destroy' | 'backToHand' | 'exile';
      this.contextMenuVisible = false;
      this.subMenuVisible = true;
      return;
    }

    if (action === 'activate') {
      if (!cost) return; // Asegura que se pase el coste de la habilidad
      const item: StackItem = {
        type: 'ActivatedAbility',
        source: this.selectedCard,
        description: `${this.selectedCard.name} activa una habilidad con coste ${cost}`,
        cost: cost,
      };

      this.stackService.pushToStack(item);
      this.contextMenuVisible = false;
      this.subMenuVisible = false;
      return;
    }

    this.emitAction(action, this.selectedCard);
  }

  emitAction(action: string, card: Permanent) {
    this.cardAction.emit({ action, card });
    this.contextMenuVisible = false;
    this.subMenuVisible = false;
    this.pendingAction = null;
  }

  resolveCommanderZone(choice: 'normal' | 'commander') {
    if (!this.selectedCard || !this.pendingAction) return;

    if (choice === 'commander') {
      this.emitAction('commander', this.selectedCard);
    } else {
      this.emitAction(this.pendingAction, this.selectedCard);
    }
  }

  getActivatedAbilities(card: Permanent): string[] {
    const abilities: string[] = [];
    const oracleText = card.originalCard?.oracle_text || '';
    const lines = oracleText.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const cost = line.substring(0, colonIndex).trim();
        const effect = line.substring(colonIndex + 1).trim();

        // Verificar si la habilidad es de maná
        const isManaAbility = effect.includes('add');

        if (!isManaAbility) {
          abilities.push(cost);
        }
      }
    }

    return abilities;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu') && !target.closest('.permanent-card')) {
      this.contextMenuVisible = false;
      this.subMenuVisible = false;
    }
  }
}
