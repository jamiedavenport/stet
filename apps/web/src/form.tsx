import type { ComponentProps } from 'react';
import { Button } from '@repo/ui/components/button';
import { Field, FieldError, FieldLabel } from '@repo/ui/components/field';
import { Input } from '@repo/ui/components/input';
import { createFormHook, createFormHookContexts } from '@tanstack/react-form';

// App-wide form setup (see TanStack Form's "Form Composition" guide).
// `useAppForm` forms render these components pre-bound to field/form state:
//   <form.AppField name="email">{(field) => <field.TextField label="Email" />}</form.AppField>
//   <form.AppForm><form.SubmitButton label="Save" /></form.AppForm>
const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

type TextFieldProps = {
  label: string;
} & Omit<ComponentProps<typeof Input>, 'id' | 'name' | 'value' | 'onBlur' | 'onChange'>;

function TextField({ label, ...inputProps }: TextFieldProps) {
  const field = useFieldContext<string>();
  const invalid = !field.state.meta.isValid;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={invalid}
        {...inputProps}
      />
      <FieldError errors={field.state.meta.errors} />
    </Field>
  );
}

function SubmitButton({
  label,
  pendingLabel,
  disabled,
}: {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
      {([canSubmit, isSubmitting]) => (
        <Button type="submit" className="w-full" disabled={!canSubmit || disabled === true}>
          {isSubmitting ? (pendingLabel ?? label) : label}
        </Button>
      )}
    </form.Subscribe>
  );
}

export const { useAppForm } = createFormHook({
  fieldComponents: { TextField },
  formComponents: { SubmitButton },
  fieldContext,
  formContext,
});
