import { Result, Button } from 'antd';
import { Link, Navigate } from 'react-router-dom';

export const To404 = () => <Navigate to="/404" replace />;

export const Page404 = () => (
  <Result
    status="404"
    title="404"
    subTitle="The page you requested does not exist."
    extra={
      <Button type="primary">
        <Link to="/">Back to Home</Link>
      </Button>
    }
  />
);
