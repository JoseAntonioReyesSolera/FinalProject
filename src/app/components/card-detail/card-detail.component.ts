import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';
import {Cart} from '../../models/cart';
import {CardEnrichmentService} from '../../services/enrich.service';

@Component({
  selector: 'app-card-detail',
  imports: [],
  templateUrl: './card-detail.component.html',
  styleUrl: './card-detail.component.css'
})
export class CardDetailComponent implements OnChanges{
  @Input() card!: Cart;
  @Input() visible = false;
  @Input() currentLevel?: number;
  @Output() closed = new EventEmitter<void>();
  isFrontFaceShown = true;

  constructor(private readonly enrichService: CardEnrichmentService) {}

  close() {
    this.closed.emit();
  }
  ngOnChanges() {
    if (this.visible && this.card) {
      // mostrar detalle
    }
  }

  toggleCardFace() {
    if (!this.card.card_faces || this.card.card_faces.length < 2) {
      return;
    }

    this.isFrontFaceShown = !this.isFrontFaceShown;
  }

  get activeFace() {
    if (this.card?.card_faces?.length > 1) {
      return this.isFrontFaceShown ? this.card.card_faces[0] : this.card.card_faces[1];
    }
    return this.card;
  }

  private isClass(card: Cart): boolean {
    return card.type_line.toLowerCase().includes('enchantment') && /level up/i.test(card.oracle_text || '');
  }

  private getClassSectionForLevel(level: number): string {
    const oracleText = this.activeFace.oracle_text || '';
    const lines = oracleText.split('\n').map(l => l.trim()).filter(l => !!l);
    let currentSection: { range: string; text: string } | null = null;
    const sections: Array<{ range: string; text: string }> = [];

    for (const line of lines) {
      const headerMatch = /^LEVEL\s+(.+)$/i.exec(line);
      if (headerMatch) {
        if (currentSection) sections.push(currentSection);
        currentSection = { range: headerMatch[1].trim(), text: '' };
        continue;
      }
      if (currentSection) {
        currentSection.text += (currentSection.text ? '\n' : '') + line;
      }
    }

    if (currentSection) sections.push(currentSection);

    const normalizedLevel = Number(level);
    for (const section of sections) {
      const range = section.range.replace(/[^0-9+\-]/g, '').trim();
      let min = 0;
      let max = Infinity;
      if (range.includes('+')) {
        min = Number(range.replace('+', '').trim());
      } else if (range.includes('-')) {
        const [start, end] = range.split('-').map(v => Number(v.trim()));
        min = start;
        max = end;
      } else {
        min = Number(range);
        max = min;
      }
      if (normalizedLevel >= min && normalizedLevel <= max) {
        return section.text;
      }
    }

    return 'No class ability at this level.';
  }

  getDisplayedOracleText() {
    if (this.currentLevel != null && this.isClass(this.activeFace)) {
      const classText = this.getClassSectionForLevel(this.currentLevel);
      return this.enrichService.sanitizeHtml(this.enrichService.replaceManaSymbolsAndHighlightTriggers(classText));
    }
    return this.activeFace.sanitizedOracleText;
  }
}
