export default function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
      style={{ background: "var(--primary-900)" }}
    >
      <div
        className="pointer-events-none absolute"
        style={{
          top: "5%",
          left: "15%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--secondary-500) 28%, transparent) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "10%",
          right: "10%",
          width: "420px",
          height: "420px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary-500) 18%, transparent) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "640px",
          height: "320px",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse, color-mix(in srgb, var(--secondary-600) 12%, transparent) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div className="relative z-10 w-full flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
