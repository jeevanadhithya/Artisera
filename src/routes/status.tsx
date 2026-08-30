import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/status')({
  component: RedirectToProfile,
});

function RedirectToProfile() {
  return <Navigate to="/profile" replace />;
}
