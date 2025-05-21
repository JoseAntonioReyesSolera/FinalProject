import { Component } from '@angular/core';
import {Phase} from '../../models/phase';
import {TriggerService} from '../../services/trigger.service';
import {BattlefieldService} from '../../services/battlefield.service';

@Component({
  selector: 'app-turn-timeline',
  imports: [],
  templateUrl: './turn-timeline.component.html',
  styleUrl: './turn-timeline.component.css',
})
export class TurnTimelineComponent {
  phases: Phase[] = [
    { name: 'Beginning Phase', steps: ['Untap', 'Upkeep', 'Draw'] },
    { name: 'PreCombat Main Phase' },
    {
      name: 'Combat Phase',
      steps: [
        'Beginning of Combat',
        'Declare Attackers',
        'Declare Blockers',
        'Combat Damage',
        'End of Combat'
      ]
    },
    { name: 'PostCombat Main Phase' },
    { name: 'Ending Phase', steps: ['End Step', 'Cleanup'] },
    { name: 'Opponent Turn' }
    ];

  phaseIndex = 0;
  stepIndex = 0;

  constructor(private readonly triggerService: TriggerService, private readonly battlefieldService: BattlefieldService) {}

  get currentPhase(): Phase {
    return this.phases[this.phaseIndex];
  }

  get currentStep(): string {
    return this.currentPhase.steps
      ? this.currentPhase.steps[this.stepIndex]
      : this.currentPhase.name;
  }

  next(): void {
    this.triggerService.detectEndOfStepTriggers(this.currentStep, this.battlefieldService.getPermanentsSnapshot());
    if (this.currentPhase.steps && this.stepIndex < this.currentPhase.steps.length - 1) {
      this.stepIndex++;
    } else {
      this.phaseIndex = (this.phaseIndex + 1) % this.phases.length;
      this.stepIndex = 0;
    }
    this.triggerService.detectBeginningOfStepTriggers(this.currentStep, this.battlefieldService.getPermanentsSnapshot());
    if (this.currentStep === 'Untap') {
      this.battlefieldService.untapAll();
    }
  }

  prev(): void {
    this.triggerService.detectEndOfStepTriggers(this.currentStep, this.battlefieldService.getPermanentsSnapshot());
    if (this.currentPhase.steps && this.stepIndex > 0) {
      this.stepIndex--;
    } else {
      this.phaseIndex =
        (this.phaseIndex - 1 + this.phases.length) % this.phases.length;
      this.stepIndex = this.phases[this.phaseIndex].steps
        ? this.phases[this.phaseIndex].steps!.length - 1
        : 0;
    }
    this.triggerService.detectBeginningOfStepTriggers(this.currentStep, this.battlefieldService.getPermanentsSnapshot());
    if (this.currentStep === 'Untap') {
      this.battlefieldService.untapAll();
    }
  }
}
