import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Permanent} from '../../models/permanent';

@Component({
  selector: 'app-permanent-card',
  templateUrl: './permanent-card.component.html',
  styleUrls: ['./permanent-card.component.css']
})
export class PermanentCardComponent {
  @Input() card!: Permanent;
  @Output() tappedChange = new EventEmitter<{ instanceId: string; tapped: boolean }>();
  @Output() remove     = new EventEmitter<string>();

  isCreature(): boolean {
    return this.card.power !== undefined && this.card.toughness !== undefined;
  }

  onTap() {
    this.card.tapped = !this.card.tapped;
    this.tappedChange.emit({ instanceId: this.card.instanceId, tapped: this.card.tapped });
  }

  onRemove() {
    this.remove.emit(this.card.instanceId);
  }
}
