import { useState } from "react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

function getInitial(name?: string | null): string {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

export default function UserAvatar({ src, name, size = 35, className = "" }: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 font-semibold select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: "#0d2a38",
        border: "1px solid #1d4a62",
        color: "#1EB6E8",
        fontSize: Math.round(size * 0.4),
      }}
    >
      {getInitial(name)}
    </div>
  );
}
