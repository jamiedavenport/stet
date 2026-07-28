import { m } from '@repo/i18n/messages';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/')({
  component: Home,
});

function Home() {
  const { session, activeOrganization } = Route.useRouteContext();
  const email = session.user.email;
  const organizationName = activeOrganization.name;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{m.welcome_back()}</CardTitle>
        <CardDescription>{m.signed_in_as_in({ email, organizationName })}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{m.use_the_sidebar_to_switch_or()}</p>
      </CardContent>
    </Card>
  );
}
