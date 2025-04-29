import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Permanent} from '../../models/permanent';

@Component({
  selector: 'app-permanent-card',
  templateUrl: './permanent-card.component.html',
  styleUrls: ['./permanent-card.component.css']
})
export class PermanentCardComponent {
  @Input() card!: Permanent;
  @Output() contextMenu = new EventEmitter<{ event: MouseEvent; card: Permanent }>();
  @Output() cardAction = new EventEmitter<{ action: string; card: Permanent }>();

  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  selectedCard: Permanent | null = null;

  onClick(event: MouseEvent) {
    event.preventDefault();
    this.contextMenuVisible = true;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.selectedCard = this.card;
  }

  castSpell(card: Permanent) {
    this.cardAction.emit({ action: 'cast', card });
    this.contextMenuVisible = false;
  }

  viewDetails(card: Permanent) {
    this.cardAction.emit({ action: 'details', card });
    this.contextMenuVisible = false;
  }

  moveToExile(card: Permanent) {
    this.cardAction.emit({ action: 'exile', card });
    this.contextMenuVisible = false;
  }
}
