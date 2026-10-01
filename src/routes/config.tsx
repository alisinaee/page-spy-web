import React from 'react';
import { Navigate, RouteObject } from 'react-router-dom';
import { useRoutes } from 'react-router-dom';

import { Page404, To404 } from '@/404';
import { Layouts } from '@/pages/Layouts';
import ProtectedRoute from '@/components/ProtectedRoute';

const Devtools = React.lazy(() => import('@/pages/Devtools'));
const RoomList = React.lazy(() => import('@/pages/RoomList'));
const Recordings = React.lazy(() => import('@/pages/Recordings'));
const RecordingViewer = React.lazy(() => import('@/pages/Recordings/Viewer'));

export interface RouteInfo {
  icon?: any;
  name: string;
  hidden?: boolean;
  children?: (RouteInfo & RouteObject)[];
  redirectTo?: string;
}

const routes: RouteObject[] = [
  {
    path: '/',
    element: <Layouts />,
    children: [
      {
        index: true,
        element: <Navigate to="room-list" replace />,
      },
      {
        path: 'devtools',
        element: (
          <ProtectedRoute>
            <Devtools />
          </ProtectedRoute>
        ),
      },
      {
        path: 'room-list',
        element: (
          <ProtectedRoute>
            <RoomList />
          </ProtectedRoute>
        ),
      },
      {
        path: 'recordings',
        element: (
          <ProtectedRoute>
            <Recordings />
          </ProtectedRoute>
        ),
      },
      {
        path: 'recordings/view',
        element: (
          <ProtectedRoute>
            <RecordingViewer />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/404',
    element: <Page404 />,
  },
  {
    path: '*',
    element: <To404 />,
  },
];

const RouteConfig = () => {
  const routeContent = useRoutes(routes);

  return routeContent;
};

export default RouteConfig;
