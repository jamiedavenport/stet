import type { ComponentType, SVGProps } from 'react';
import {
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
  FlagIcon,
  QuestionIcon,
} from '@phosphor-icons/react';
import { hasFlag } from 'country-flag-icons';
import 'country-flag-icons/3x2/flags.css';

type RowIconKind = 'country' | 'device';
type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

const devices: Record<string, SvgIcon> = {
  desktop: DesktopIcon,
  mobile: DeviceMobileIcon,
  tablet: DeviceTabletIcon,
};

function CountryFlag({ code }: { code: string }) {
  if (!hasFlag(code)) {
    return <FlagIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />;
  }
  return (
    <span
      aria-hidden
      className={`flag:${code} shrink-0 rounded-[2px] text-sm ring-1 ring-foreground/10`}
    />
  );
}

export function BreakdownRowIcon({ kind, value }: { kind?: RowIconKind; value: string }) {
  if (kind === 'country') {
    return <CountryFlag code={value.toUpperCase()} />;
  }
  if (kind === 'device') {
    const Device = devices[value.toLowerCase()] ?? QuestionIcon;
    return <Device aria-hidden className="size-4 shrink-0 text-muted-foreground" />;
  }
  return null;
}
