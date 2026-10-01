import { Link } from 'react-router-dom';
import { BRAND_NAME } from '@/utils/brand';

export const Logo = () => {
  return (
    <Link to="/" className="flex h-14 items-center gap-2">
      <h4 className="text-base font-semibold leading-tight text-foreground">
        {BRAND_NAME}
      </h4>
    </Link>
  );
};
