import { Link } from 'react-router-dom';
import { BRAND_NAME } from '@/utils/brand';

export const Logo = () => {
  return (
    <Link
      to="/room-list"
      className="flex h-12 items-center text-sm font-semibold tracking-tight text-foreground"
    >
      {BRAND_NAME}
    </Link>
  );
};
