import { Button } from '@repo/ui/components/button';
import { DisplayHeading, Label, Lede } from '@repo/ui/marketing/ui.tsrx';
import { Link } from '@tanstack/react-router';

export function NotFound() @{
  <main className="flex min-h-dvh flex-col bg-background text-foreground antialiased">
    <div className="mx-auto w-full max-w-7xl px-6 pt-24 pb-16 lg:px-8">
      <Label>404</Label>
      <DisplayHeading as="h1" className="mt-6 max-w-[24ch] text-4xl sm:text-6xl">
        This page doesn&apos;t exist.
      </DisplayHeading>
      <Lede className="mt-6">The address may be wrong, or the page may have moved.</Lede>
      <Button
        size="lg"
        variant="outline"
        nativeButton={false}
        className="mt-10"
        render={<Link to="/" />}
      >
        Back to the home page
      </Button>
    </div>
  </main>
}
