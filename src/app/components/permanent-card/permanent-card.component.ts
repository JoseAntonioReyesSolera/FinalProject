import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {Permanent} from '../../models/permanent';
import {StackItem} from '../../models/stack-item';
import {StackService} from '../../services/stack.service';
import {BattlefieldService} from '../../services/battlefield.service';
import {LogService} from '../../services/log.service';
import {GameStorageService} from '../../services/game-storage.service';
import {SafeHtml} from '@angular/platform-browser';

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
  isFrontFaceShown = true;

  selectedCard: Permanent | null = null;
  pendingAction: 'destroy' | 'backToHand' | 'exile' | null = null;

  constructor(
    private readonly stackService: StackService,
    private readonly bf: BattlefieldService,
    private readonly logService: LogService,
    private readonly gameStorage: GameStorageService
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

  executeAction(action: 'cast' | 'details' | 'destroy' | 'backToHand' | 'exile' | 'activate' | 'transform', cost?: string) {
    if (!this.selectedCard) return;

    if (['destroy', 'backToHand', 'exile'].includes(action) && this.selectedCard.originalCard?.isCommander) {
      this.pendingAction = action as 'destroy' | 'backToHand' | 'exile';
      this.contextMenuVisible = false;
      this.subMenuVisible = true;
      return;
    }

    if (action === 'transform') {
      this.bf.transformPermanent(this.card.instanceId);
    }

    if (action === 'activate') {
      if (!cost) return; // Asegura que se pase el coste de la habilidad

      const oracleText = this.selectedCard.originalCard?.oracle_text || '';

// Busca líneas que empiecen exactamente con el coste (por ejemplo, '{1}{T}:')
      const line = oracleText
        .split('\n')
        .map(l => l.trim())
        .find(l => l.startsWith(cost + ':'));

      const efecto = line?.split(':')[1]?.trim() ?? '';

      const isManaAbility = /Add\s+\{|\bany color\b/i.test(efecto);

      if (cost.includes('{T}')) {
        this.card.tapped = true;
        this.logService.addLog("[PermanentCardComponent.executeAction]", this.card.name, "girada al activar", cost);
      }

      if (isManaAbility) {
        // Ejecutar directamente la habilidad de maná (puedes ajustar esta lógica si usas otra forma de aplicar el efecto)
        this.logService.addLog("[PermanentCardComponent.executeAction] ", "mana ability ", this.card.name, ": ", cost);
        // Aquí podrías agregar lógica para modificar la reserva de maná si la implementas
      }
      const sanitizedEfecto = this.gameStorage['sanitizeHtml'](
        this.gameStorage['replaceManaSymbolsAndHighlightTriggers'](efecto));
        const item: StackItem = {
          type: 'ActivatedAbility',
          source: this.selectedCard,
          description: `Activate an ability:`,
          cost: cost,
          efecto: sanitizedEfecto,
        };
        this.stackService.pushToStack(item);
        this.logService.addLog("[PermanentCardComponent.executeAction] ", "no-mana ability ", this.card.name, ": ", cost)


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

  getActivatedAbilities(card: Permanent): { cost: string; sanitized: SafeHtml }[] {
    const oracleText = card.originalCard?.oracle_text || '';
    const lines = oracleText.split('\n');
    const abilities: { cost: string; sanitized: SafeHtml }[] = [];

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const cost = line.substring(0, colonIndex).trim();
        const sanitized = this.gameStorage['sanitizeHtml'](
          this.gameStorage['replaceManaSymbolsAndHighlightTriggers'](cost));

          abilities.push({cost, sanitized});
        }
    }

    return abilities;
  }

  toggleTap() {
    this.card.tapped = !this.card.tapped;
    this.logService.addLog("[PermanentCardComponent.toggleTap]", this.card.name, this.card.tapped ? "girada" : "enderezada");
    this.contextMenuVisible = false;
    this.subMenuVisible = false;
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
