import * as React from "react"
import { cn } from "@/lib/utils"

export function Select({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-2 space-y-2", className)} {...props} />
}

export function SelectTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm text-left",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SelectValue({
  placeholder,
  children,
  className,
}: {
  placeholder?: string
  children?: React.ReactNode
  className?: string
}) {
  return <span className={cn("text-muted-foreground", className)}>{children ?? placeholder}</span>
}

export function SelectContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-border bg-card p-1", className)} {...props} />
}

type SelectItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: string
}

export function SelectItem({ className, value, ...props }: SelectItemProps) {
  return (
    <div
      data-value={value}
      className={cn("cursor-default rounded-md px-3 py-2 text-sm hover:bg-muted", className)}
      {...props}
    />
  )
}
