'use client'

interface TypingIndicatorProps {
  name?: string
}

export function TypingIndicator({ name }: TypingIndicatorProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
      </div>
      <span className="text-xs text-muted-foreground">
        {name ? `${name} is typing...` : 'Typing...'}
      </span>
    </div>
  )
}
