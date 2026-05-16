import { Check } from "lucide-react";

type CheckboxFieldProps = {
  checked: boolean;
  label?: string;
  onChange: (checked: boolean) => void;
};

export function CheckboxField({ checked, label = "Analysed", onChange }: CheckboxFieldProps) {
  return (
    <label className="checkbox-field">
      {label}
      <span className="checkbox-control">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{checked ? "Yes" : "No"}</span>
      </span>
    </label>
  );
}

type ChipButtonProps = {
  children: string;
  selected: boolean;
  onClick: () => void;
};

export function ChipButton({ children, selected, onClick }: ChipButtonProps) {
  return (
    <button
      className={selected ? "topic-chip selected" : "topic-chip"}
      type="button"
      onClick={onClick}
    >
      {selected ? <Check aria-hidden="true" size={14} /> : null}
      {children}
    </button>
  );
}

type AnalysisStatusProps = {
  analysed: boolean;
};

export function AnalysisStatus({ analysed }: AnalysisStatusProps) {
  return (
    <span className={analysed ? "analysis-status analysed" : "analysis-status"}>
      {analysed ? "Analysed" : "Pending analysis"}
    </span>
  );
}
