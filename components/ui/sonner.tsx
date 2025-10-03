"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

type Props = Omit<ToasterProps, "theme">;

const Toaster = ({ ...props }: Props) => {
  const { theme } = useTheme();

  // Narrow next-theme's string/undefined to Sonner's allowed values
  const sonnerTheme: NonNullable<ToasterProps["theme"]> =
    theme === "light" || theme === "dark" || theme === "system" ? theme : "system";

  return (
    <Sonner
      {...props}
      theme={sonnerTheme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
    />
  )
}

export { Toaster }
