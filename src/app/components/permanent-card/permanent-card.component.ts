import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {Permanent} from '../../models/permanent';
import {StackItem} from '../../models/stack-item';
import {StackService} from '../../services/stack.service';
import {BattlefieldService} from '../../services/battlefield.service';
import {LogService} from '../../services/log.service';
import {SafeHtml} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {TurnService} from '../../services/turn.service';
import {AsyncPipe} from '@angular/common';
import {TriggerService} from '../../services/trigger.service';
import {CardEnrichmentService} from '../../services/enrich.service';

@Component({
  selector: 'app-permanent-card',
  templateUrl: './permanent-card.component.html',
  imports: [
    FormsModule,
    AsyncPipe
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

  showCounterModal = false;
  selectedCounterType = '';
  counterAmount = 1;
  isAttacking = false;

  counterTypes = [
    'counter', '+1/+1', '-1/-1', 'Flying', 'Menace',
    'Shield', 'Deathtouch', 'Charge', 'Energy', 'Oil'

  ];
  selectedCard: Permanent | null = null;
  pendingAction: 'destroy' | 'backToHand' | 'exile' | null = null;

  constructor(
    private readonly stackService: StackService,
    private readonly bf: BattlefieldService,
    private readonly triggerService: TriggerService,
    private readonly logService: LogService,
    public readonly turnService: TurnService,
    private readonly enrichService: CardEnrichmentService
  ) {}

  onClick(event: MouseEvent) {
    event.preventDefault();
    const x = event.clientX;
    const y = event.clientY;
    this.contextMenuVisible = true;
    this.subMenuVisible = false;
    this.contextMenuPosition = { x,y};
    this.selectedCard = this.card;
  }

  executeAction(
    action: 'cast' | 'details' | 'destroy' | 'backToHand' | 'exile' | 'activate' | 'transform',
    cost?: string
  ) {
    if (!this.selectedCard) return;

    if (this.isCommanderZoneAction(action)) {
      this.prepareCommanderSubmenu(action);
      return;
    }

    switch (action) {
      case 'transform':
        this.bf.transformPermanent(this.card.instanceId);
        break;
      case 'activate':
        this.handleActivatedAbility(cost);
        break;
      default:
        this.emitAction(action, this.selectedCard);
    }
  }

  private isCommanderZoneAction(action: string): boolean | undefined {
    return ['destroy', 'backToHand', 'exile'].includes(action) &&
      this.selectedCard?.originalCard?.isCommander;
  }

  private prepareCommanderSubmenu(action: string) {
    this.pendingAction = action as 'destroy' | 'backToHand' | 'exile';
    this.contextMenuVisible = false;
    this.subMenuVisible = true;
  }

  private handleActivatedAbility(cost?: string) {
    if (!cost || this.stackService.isSplitSecondActive()) {
      if (this.stackService.isSplitSecondActive()) {
        this.card.tapped = false;
        this.logService.addLog("[PermanentCardComponent.executeAction]", "No se puede activar habilidad por Split Second activo.");
      }
      return;
    }

    const oracleText = this.selectedCard?.originalCard?.oracle_text ?? '';
    const line = oracleText.split('\n').map(l => l.trim()).find(l => l.startsWith(cost + ':'));
    const efecto = line?.split(':')[1]?.trim() ?? '';

    if (cost.includes('{T}')) {
      this.card.tapped = true;
      this.logService.addLog("[PermanentCardComponent.executeAction]", this.card.name, "girada al activar", cost);
    }

    if (this.isManaAbility(efecto)) {
      this.logService.addLog("[PermanentCardComponent.executeAction]", "mana ability", this.card.name, ": ", cost);
      this.closeMenus();
      return;
    }

    if (this.card.type.includes('Planeswalker') && this.isLoyaltyAbility(cost)) {
      if (!this.applyLoyaltyCost(cost)) return;
    }

    const sanitizedEfecto = this.enrichService['sanitizeHtml'](
      this.enrichService['replaceManaSymbolsAndHighlightTriggers'](efecto)
    );

    const item: StackItem = {
      type: 'ActivatedAbility',
      source: this.selectedCard!,
      description: `Activate an ability:`,
      cost: cost,
      efecto: sanitizedEfecto,
    };

    this.stackService.pushToStack(item);
    this.logService.addLog("[PermanentCardComponent.executeAction]", "no-mana ability", this.card.name, ": ", cost);
    this.closeMenus();
  }

  private isManaAbility(efecto: string): boolean {
    return /Add\s+\{|\bany color\b/i.test(efecto);
  }

  private isLoyaltyAbility(cost: string): boolean {
    return /^([+\u2212]?)(\d+)$/.test(cost);
  }

  private applyLoyaltyCost(cost: string): boolean {
    const match = RegExp(/^([+\u2212]?)(\d+)$/).exec(cost);
    if (!match) return false;

    const sign = match[1];
    const amount = parseInt(match[2], 10);
    const currentLoyalty = Number(this.card.loyalty ?? 0);
    const change = sign === '\u2212' ? -amount : amount;

    if (change < 0 && Math.abs(change) > currentLoyalty) {
      this.logService.addLog("[PermanentCardComponent]", `${this.card.name} no tiene suficiente lealtad para usar ${cost}`);
      return false;
    }

    const newLoyalty = currentLoyalty + change;
    this.card.loyalty = newLoyalty;
    this.logService.addLog("[PermanentCardComponent]", `${this.card.name} ahora tiene ${newLoyalty} lealtad tras activar ${cost}`);
    return true;
  }

  private closeMenus() {
    this.contextMenuVisible = false;
    this.subMenuVisible = false;
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
      this.card.originalCard.mana_cost = "{2}" + this.card.originalCard.mana_cost
      this.card.originalCard.sanitizedManaCost = this.enrichService.sanitizeHtml(this.enrichService.replaceManaSymbolsAndHighlightTriggers(this.card.originalCard.mana_cost));
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
        const sanitized = this.enrichService['sanitizeHtml'](
          this.enrichService['replaceManaSymbolsAndHighlightTriggers'](cost));

          abilities.push({cost, sanitized});
        }
    }

    return abilities;
  }

  toggleTap() {
    this.card.tapped = !this.card.tapped;
    this.logService.addLog("[PermanentCardComponent.toggleTap]", this.card.name, this.card.tapped ? "girada" : "enderezada");
    if (!this.card.tapped) {
      this.isAttacking = false;
    }
    this.contextMenuVisible = false;
    this.subMenuVisible = false;
  }

  openCounterModal() {
    this.selectedCard = this.card;
    this.counterAmount = 1;
    this.selectedCounterType = 'counter';
    this.showCounterModal = true;
    this.contextMenuVisible = false;
  }

  closeCounterModal() {
    this.showCounterModal = false;
  }

  addCounter() {
    if (!this.selectedCard) return;

    const existing = this.selectedCard.counters?.find(c => c.type === this.selectedCounterType);
    if (existing) {
      existing.amount += this.counterAmount;
      if (existing.amount <= 0) {
        // Eliminar el contador si llega a 0 o menos
        this.selectedCard.counters = this.selectedCard.counters?.filter(c => c.type !== this.selectedCounterType);
        this.logService.addLog(
          "[PermanentCardComponent.addCounter]",
          `Contadores de ${this.selectedCounterType} eliminados de ${this.selectedCard.name}`
        );
      } else {
        this.logService.addLog(
          "[PermanentCardComponent.addCounter]",
          `Actualizado contador de ${this.selectedCounterType} a ${existing.amount} en ${this.selectedCard.name}`
        );
      }
    } else if (this.counterAmount > 0) {
      if (!this.selectedCard.counters) this.selectedCard.counters = [];
      this.selectedCard.counters.push({
        type: this.selectedCounterType,
        amount: this.counterAmount
      });
      this.logService.addLog(
        "[PermanentCardComponent.addCounter]",
        `Añadido ${this.counterAmount} contador(es) de ${this.selectedCounterType} a ${this.selectedCard.name}`
      );
    } else {
      this.logService.addLog(
        "[PermanentCardComponent.addCounter]",
        `No se puede quitar contadores de tipo ${this.selectedCounterType} porque no hay ninguno`
      );
    }
    this.showCounterModal = false;
  }

  changeCounterAmount(amount: number) {
    this.counterAmount += amount;
  }

  getModifiedStats(card: Permanent): string | null {
    // Criaturas con contadores +1/+1 y -1/-1
    if (card.type.includes("Creature")) {
      const basePower = Number(card.power ?? 0);
      const baseToughness = Number(card.toughness ?? 0);
      let power = basePower;
      let toughness = baseToughness;

      for (const counter of card.counters) {
        if (counter.type === '+1/+1') {
          power += counter.amount;
          toughness += counter.amount;
        } else if (counter.type === '-1/-1') {
          power -= counter.amount;
          toughness -= counter.amount;
        }
      }

      // Aplicar bonos globales
      const buffs = this.bf.getGlobalPowerToughnessBuffs(card);
      power += buffs.power;
      toughness += buffs.toughness;

      return `${power}/${toughness}`;
    }
    return null;
  }

  isCreature(): boolean {
    return this.card.type.toLowerCase().includes('creature');
  }

  /** acción especial al pulsar el botón */
  onAttackPhaseAction() {
    this.isAttacking = !this.isAttacking;

    if (this.isAttacking)
      this.triggerService.detectTriggers('attackDeclare', this.bf.getPermanentsSnapshot(), {source: this.card});

    const hasVigilance = this.card.originalCard.keywords
      ?.map(k => k.toLowerCase())
      .includes('vigilance');
    if (!hasVigilance) {
      this.card.tapped = true;
    }

    this.contextMenuVisible = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu') && !target.closest('.permanent-card')) {
      this.contextMenuVisible = false;
      this.subMenuVisible = false;
      this.showCounterModal = false;
    }
  }
}
