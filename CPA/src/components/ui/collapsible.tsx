"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleContextType {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CollapsibleContext = React.createContext<CollapsibleContextType | null>(null)

interface CollapsibleProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
}

const Collapsible = React.forwardRef<HTMLDivElement, CollapsibleProps>(
  ({ children, open: controlledOpen, onOpenChange, defaultOpen = false, ...props }, ref) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
    const open = controlledOpen ?? internalOpen
    
    const handleOpenChange = React.useCallback((newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen)
      } else {
        setInternalOpen(newOpen)
      }
    }, [onOpenChange])

    const value = React.useMemo(() => ({
      open,
      onOpenChange: handleOpenChange
    }), [open, handleOpenChange])

    return (
      <CollapsibleContext.Provider value={value}>
        <div ref={ref} {...props}>
          {children}
        </div>
      </CollapsibleContext.Provider>
    )
  }
)
Collapsible.displayName = "Collapsible"

interface CollapsibleTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

const CollapsibleTrigger = React.forwardRef<HTMLButtonElement, CollapsibleTriggerProps>(
  ({ children, onClick, ...props }, ref) => {
    const context = React.useContext(CollapsibleContext)
    
    if (!context) {
      throw new Error('CollapsibleTrigger must be used within a Collapsible')
    }
    
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      context.onOpenChange(!context.open)
      onClick?.(event)
    }

    return (
      <button
        ref={ref}
        onClick={handleClick}
        aria-expanded={context.open}
        {...props}
      >
        {children}
      </button>
    )
  }
)
CollapsibleTrigger.displayName = "CollapsibleTrigger"

interface CollapsibleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CollapsibleContent = React.forwardRef<HTMLDivElement, CollapsibleContentProps>(
  ({ children, className, ...props }, ref) => {
    const context = React.useContext(CollapsibleContext)
    
    if (!context) {
      throw new Error('CollapsibleContent must be used within a Collapsible')
    }

    if (!context.open) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn("transition-all duration-200 ease-in-out", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }