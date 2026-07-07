export default function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-md px-5 pt-6 pb-5 sm:px-9 sm:pt-7 sm:pb-[22px]"
      style={{
        maxWidth: "480px",
        borderRadius: "26px",
        background: "linear-gradient(180deg, var(--primary-800), var(--primary-700))",
        border: "1px solid var(--gray-600)",
        boxShadow: "0 40px 90px -40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {children}
    </div>
  );
}
