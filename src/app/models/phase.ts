export interface Phase {
  name: string;
  label: string;
  steps?: { name: string; label: string }[];
}
