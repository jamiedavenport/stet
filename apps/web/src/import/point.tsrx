import { useState } from 'react';
import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';

export function PointStep(props: { onScan: (url: string) => Promise<void> }) @{
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async () => {
    if (url.trim() === '' || scanning) {
      return;
    }
    setScanning(true);
    setError(null);
    try {
      await props.onScan(url.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not scan that site.');
    } finally {
      setScanning(false);
    }
  };

  <div className="flex max-w-xl flex-col gap-4">
    <p className="text-sm text-muted-foreground">
      {"Point Stet at a site. It reads the pages, proposes a content model, and imports the content, with a review at every step before anything is created."}
    </p>
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        void scan();
      }}
    >
      <Input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="example.com"
        aria-label="Site URL"
        autoFocus
      />
      <Button type="submit" disabled={scanning || url.trim() === ''}>
        {scanning ? 'Scanning…' : 'Scan site'}
      </Button>
    </form>
    @if (error !== null) {
      <p className="text-sm text-destructive">{error}</p>
    }
  </div>
}
