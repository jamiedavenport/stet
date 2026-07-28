import { Button } from '@repo/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/tooltip';
import type { ReactNode } from 'react';

type ToolbarButtonProps = {
  label: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
};

/**
 * A single formatting control. Rendered as a toggle button so screen readers
 * announce whether the mark or node is applied at the cursor.
 */
export function ToolbarButton({ label, icon, active, disabled, onClick }: ToolbarButtonProps) @{
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label={label}
          aria-pressed={active === true}
          disabled={disabled === true}
          // Focus must stay in the document, or the selection the command
          // acts on collapses before the click handler runs.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClick}
          className={active === true ? 'bg-muted text-foreground' : undefined}
        >
          {icon}
        </Button>
      }
    />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
}
