export default function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: "var(--primary-900)" }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            "radial-gradient(40% 50% at 22% 38%, color-mix(in srgb, var(--secondary-600) 16%, transparent), transparent 70%)",
            "radial-gradient(45% 55% at 82% 72%, color-mix(in srgb, var(--primary-500) 12%, transparent), transparent 70%)",
            "radial-gradient(38% 45% at 88% 30%, color-mix(in srgb, var(--primary-600) 40%, transparent), transparent 70%)",
          ].join(", "),
        }}
      />
      <div className="relative z-10 w-full flex items-center justify-center px-4 py-4">
        {children}
      </div>
    </div>
  );
}
