export default function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-md rounded-2xl p-8"
      style={{
        background: "color-mix(in srgb, var(--primary-800) 55%, transparent)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        border: "1px solid var(--primary-700)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.50)",
      }}
    >
      {children}
    </div>
  );
}
