export type TriggerType = 'When' | 'Whenever' | 'At';

export interface TriggeredAbility {
  triggerType: TriggerType;
  fullSentence: string;
}
