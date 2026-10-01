import { Button } from '@/components/ui/button';
import { Link, Navigate } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export const To404 = () => <Navigate to="/404" replace />;

export const Page404 = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
    <div className="rounded-full bg-muted p-4 text-muted-foreground">
      <FileQuestion className="size-12" />
    </div>
    <h1 className="text-4xl font-bold tracking-tight">404</h1>
    <p className="text-muted-foreground text-sm max-w-sm">
      The page you requested does not exist.
    </p>
    <Link to="/" className="mt-2 inline-block">
      <Button size="lg">Back to Home</Button>
    </Link>
  </div>
);
