import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps {
  label: string;
  name?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  maxLength?: number;
}

export default function AuthInput({
  label,
  name,
  type = "text",
  placeholder,
  required,
  icon,
  value,
  onChange,
  autoComplete,
  maxLength,
}: AuthInputProps) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="flex flex-col" style={{ gap: "7px" }}>
      <label
        style={{ fontSize: "14.5px", fontWeight: 600, color: "var(--gray-200)" }}
      >
        {label}
      </label>
      <div
        className="relative flex items-center transition-all"
        style={{
          height: "50px",
          borderRadius: "14px",
          border: `1px solid ${focused ? "var(--primary-500)" : "var(--gray-600)"}`,
          background: focused
            ? "color-mix(in srgb, var(--primary-600) 30%, var(--primary-900))"
            : "var(--primary-900)",
          boxShadow: focused ? "0 0 0 3px color-mix(in srgb, var(--primary-500) 16%, transparent)" : "none",
          padding: "0 16px",
          gap: "12px",
        }}
      >
        {icon && (
          <span
            className="flex items-center flex-none transition-colors"
            style={{ color: focused ? "var(--primary-400)" : "var(--gray-500)" }}
          >
            {icon}
          </span>
        )}
        <input
          type={inputType}
          name={name}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className="flex-1 focus:outline-none bg-transparent"
          style={{
            fontSize: "16px",
            color: "var(--gray-100)",
            paddingRight: isPassword ? "0" : "0",
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="flex items-center justify-center flex-none rounded-[9px] transition-colors"
            style={{
              width: "34px",
              height: "34px",
              background: "none",
              border: "none",
              color: "var(--gray-500)",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gray-300)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gray-500)"; }}
            tabIndex={-1}
          >
            {show ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        )}
      </div>
    </div>
  );
}
