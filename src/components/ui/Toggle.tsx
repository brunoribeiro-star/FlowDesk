import clsx from "clsx";

export default function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="relative w-[52px] h-[30px] rounded-full transition-all shrink-0"
      style={value
        ? { background: "linear-gradient(135deg, var(--primary-400), var(--primary-500))", boxShadow: "0 0 18px -4px rgba(30,182,232,0.7)" }
        : { background: "var(--gray-700)" }}
    >
      <span
        className={clsx(
          "absolute top-[3px] w-6 h-6 rounded-full transition-all",
          value ? "left-[25px] bg-white" : "left-[3px] bg-gray-300"
        )}
      />
    </button>
  );
}
