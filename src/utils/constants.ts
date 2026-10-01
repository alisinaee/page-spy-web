export const isClient = import.meta.env.MODE === 'client';

export const deployPath = window.DEPLOY_BASE_PATH;
export const deployUrl = `${location.protocol}//${window.DEPLOY_BASE_PATH}`;

export const PLACEHOLDER_RESPONSE =
  '__PLACEHOLDER_RESPONSE_DEFINED_BY_PAGE_SPY__';
