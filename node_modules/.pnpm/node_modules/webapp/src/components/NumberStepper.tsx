// apps/webapp/src/components/NumberStepper.tsx
import React from "react";

type NumberStepperProps = {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
};

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  placeholder,
  suffix,
}: NumberStepperProps) {
  const handleMinus = () => {
    const next = value - step;
    if (next < min) return;
    onChange(next);
  };

  const handlePlus = () => {
    const next = value + step;
    if (typeof max === "number" && next > max) return;
    onChange(next);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(min);
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) return;
    if (num < min) {
      onChange(min);
      return;
    }
    if (typeof max === "number" && num > max) {
      onChange(max);
      return;
    }
    onChange(num);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label ? (
        <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
      ) : null}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button type="button" onClick={handleMinus} style={btn}>
          –
        </button>
        <div style={{ position: "relative", flex: 1 }}>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={handleInput}
            placeholder={placeholder}
            style={input}
          />
          {suffix ? (
            <span
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
                opacity: 0.5,
              }}
            >
              {suffix}
            </span>
          ) : null}
        </div>
        <button type="button" onClick={handlePlus} style={btn}>
          +
        </button>
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: "1px solid rgba(0,0,0,.08)",
  background: "#fff",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid rgba(0,0,0,.08)",
  borderRadius: 10,
  padding: "7px 10px",
  fontSize: 14,
  outline: "none",
};
