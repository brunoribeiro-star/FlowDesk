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
  const isPassword = type === "password";
  const inputType = isPassword ? (show ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" style={{ color: "var(--gray-200)" }}>
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <span
            className="absolute left-3.5 w-4 h-4 flex items-center justify-center"
            style={{ color: "var(--gray-400)" }}
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
          className="w-full h-11 rounded-xl text-sm focus:outline-none transition-colors"
          style={{
            background: "var(--primary-800)",
            border: "1px solid var(--primary-700)",
            color: "var(--gray-100)",
            paddingLeft: icon ? "2.5rem" : "1rem",
            paddingRight: isPassword ? "2.75rem" : "1rem",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--primary-500)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--primary-700)";
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 transition-colors"
            style={{ color: "var(--gray-400)" }}
            tabIndex={-1}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
