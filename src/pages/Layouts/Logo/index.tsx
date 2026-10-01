import { Link } from 'react-router-dom';
import './index.less';
import { BRAND_NAME } from '@/utils/brand';

export const Logo = () => {
  return (
    <Link to="/" className="logo flex items-center gap-2">
      <h4 className="logo-name m-0 text-base font-semibold leading-tight text-foreground">
        {BRAND_NAME}
      </h4>
    </Link>
  );
};
