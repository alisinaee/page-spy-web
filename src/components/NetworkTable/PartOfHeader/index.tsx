import { AlertCircle } from 'lucide-react';

export const PartOfHeader = () => (
  <span className="inline-flex items-center gap-1 font-normal text-warning">
    <AlertCircle className="size-3.5" />
    Only some headers are shown
  </span>
);
