import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: "green" | "blue" | "none";
  onClick?: () => void;
}

const Card = ({ children, className = "", glow = "none", onClick }: CardProps) => {
  const glowClass = glow === "green" ? "glow-green" : glow === "blue" ? "glow-blue" : "";

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-card border border-border p-4 ${glowClass} ${onClick ? "cursor-pointer hover:border-primary/30 transition-colors" : ""} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
