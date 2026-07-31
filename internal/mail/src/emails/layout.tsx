import type { CSSProperties, ReactNode } from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

/** Shared colours, so email rebrands in one place. */
export const palette = {
  page: '#fafafa',
  surface: '#ffffff',
  border: '#e5e5e5',
  heading: '#171717',
  body: '#404040',
  muted: '#737373',
  onAccent: '#fafafa',
  danger: '#b91c1c',
};

const styles = {
  body: { backgroundColor: palette.page, fontFamily: 'sans-serif' },
  container: {
    margin: '40px auto',
    padding: '32px',
    maxWidth: '420px',
    backgroundColor: palette.surface,
    borderRadius: '10px',
    border: `1px solid ${palette.border}`,
  },
  heading: { fontSize: '20px', margin: '0 0 16px' },
  text: { fontSize: '14px', color: palette.body, lineHeight: '22px' },
  section: { margin: '24px 0' },
  sectionTight: { margin: '24px 0 0' },
  footer: { fontSize: '12px', color: palette.muted },
  footerTight: { fontSize: '12px', color: palette.muted, margin: '16px 0 0' },
  footerExtra: { fontSize: '12px', color: palette.muted, margin: '8px 0 0' },
};

/** A paragraph in an email body, for templates that pass `children`. */
export function EmailText({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <Text style={{ ...styles.text, ...style }}>{children}</Text>;
}

/** Muted inline link colour, for footer links inside `footerLinks`. */
export const emailLinkStyle = { color: palette.muted };

export type ActionEmailProps = {
  preview: string;
  heading: string;
  /** A single paragraph. Templates needing more pass `children` instead. */
  body?: string;
  action: { href: string; label: string; danger?: boolean };
  footer: string;
  /**
   * An extra footer row below `footer`. Bulk email (digests, reminders) puts
   * its one-click unsubscribe link here; transactional email leaves it unset.
   */
  footerLinks?: ReactNode;
  children?: ReactNode;
  /**
   * Collapses the trailing space below the action and the footer. For bodies
   * that already end in their own bottom margin, such as the digest's item
   * list, where the default gaps would stack.
   */
  tightBottom?: boolean;
};

/**
 * The shell every template renders: a centred card with a heading, body, one
 * primary action, and a muted footer.
 */
export function ActionEmail({
  preview,
  heading,
  body,
  action,
  footer,
  footerLinks,
  children,
  tightBottom = false,
}: ActionEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Heading style={styles.heading}>{heading}</Heading>
          {body === undefined ? children : <EmailText>{body}</EmailText>}
          <Section style={tightBottom ? styles.sectionTight : styles.section}>
            <Button
              href={action.href}
              style={{
                backgroundColor: action.danger === true ? palette.danger : palette.heading,
                color: palette.onAccent,
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              {action.label}
            </Button>
          </Section>
          <Text style={tightBottom ? styles.footerTight : styles.footer}>{footer}</Text>
          {footerLinks === undefined ? null : <Text style={styles.footerExtra}>{footerLinks}</Text>}
        </Container>
      </Body>
    </Html>
  );
}
