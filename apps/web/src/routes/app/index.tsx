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
        <CardTitle>{'Welcome back'}</CardTitle>
        <CardDescription>{`Signed in as ${email} in ${organizationName}.`}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {'Use the sidebar to switch or create organizations.'}
        </p>
      </CardContent>
    </Card>
  );
}
