import { AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';

export const PartOfHeader = () => (
  <Tooltip>
    <TooltipTrigger
      render={
        <span className="cursor-pointer inline-flex items-center text-amber-500">
          <AlertCircle className="w-3.5 h-3.5" />
        </span>
      }
    />
    <TooltipContent>CAUTION: just part of headers are shown.</TooltipContent>
  </Tooltip>
);
