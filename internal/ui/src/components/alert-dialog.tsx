import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from '@base-ui/react/alert-dialog';

import { cn } from '../lib/utils';
import { Button } from './button';

function AlertDialog(props: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogContent({ className, ...props }: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/20 backdrop-blur-xs transition-opacity data-ending-style:opacity-0 data-starting-style:opacity-0" />
      <AlertDialogPrimitive.Viewport className="fixed inset-0 z-50 grid place-items-center p-4">
        <AlertDialogPrimitive.Popup
          data-slot="alert-dialog-content"
          className={cn(
            'w-full max-w-md rounded-xl bg-popover p-5 text-popover-foreground shadow-lg ring-1 ring-foreground/10 transition data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:p-6 dark:shadow-none',
            className,
          )}
          {...props}
        />
      </AlertDialogPrimitive.Viewport>
    </AlertDialogPrimitive.Portal>
  );
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2', className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title className={cn('text-base font-semibold', className)} {...props} />
  );
}

function AlertDialogDescription({ className, ...props }: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      className={cn('text-base text-pretty text-muted-foreground sm:text-sm', className)}
      {...props}
    />
  );
}

function AlertDialogCancel(props: AlertDialogPrimitive.Close.Props) {
  return (
    <AlertDialogPrimitive.Close render={<Button type="button" variant="outline" />} {...props} />
  );
}

function AlertDialogAction({
  variant = 'default',
  ...props
}: AlertDialogPrimitive.Close.Props & {
  variant?: React.ComponentProps<typeof Button>['variant'];
}) {
  return (
    <AlertDialogPrimitive.Close render={<Button type="button" variant={variant} />} {...props} />
  );
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
};
