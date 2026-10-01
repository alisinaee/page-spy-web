import React from 'react';
import ErrorSvg from '@/assets/image/error.svg?react';
import InfoSvg from '@/assets/image/info.svg?react';
import WarnSvg from '@/assets/image/warn.svg?react';
import DebugOriginSvg from '@/assets/image/debug-origin.svg?react';
import DebugEvalSvg from '@/assets/image/debug-eval.svg?react';
import UserSvg from '@/assets/image/user.svg?react';
import DebugSvg from '@/assets/image/debug.svg?react';
import type { SpyConsole } from '@huolala-tech/page-spy-types';

interface ThemeItem {
  color: string;
  icon: React.ComponentType<{
    style?: React.CSSProperties;
    className?: string;
  }> | null;
}

type Theme = Record<SpyConsole.DataType | 'default', ThemeItem>;

const Type2Theme: Partial<Theme> = {
  info: {
    color: 'var(--info)',
    icon: InfoSvg,
  },
  error: {
    color: 'var(--destructive)',
    icon: ErrorSvg,
  },
  warn: {
    color: 'var(--warning)',
    icon: WarnSvg,
  },
  debug: {
    color: 'var(--primary-text)',
    icon: DebugSvg,
  },
  'debug-origin': {
    color: 'var(--primary-text)',
    icon: DebugOriginSvg,
  },
  'debug-eval': {
    color: 'var(--primary-text)',
    icon: DebugEvalSvg,
  },
  default: {
    color: 'var(--foreground)',
    icon: UserSvg,
  },
};

interface Props {
  type: SpyConsole.DataType;
}

const LogType = ({ type }: Props) => {
  const logType = type.toLowerCase() as SpyConsole.DataType;
  let theme = Type2Theme.default;
  if (logType in Type2Theme) {
    theme = Type2Theme[logType];
  }
  const IconComp = theme?.icon;
  return (
    <span
      className="log-type inline-flex size-5 items-center justify-center"
      style={{ color: theme?.color }}
    >
      {IconComp && <IconComp style={{ width: 16, height: 16 }} />}
      <span className="sr-only">{logType}</span>
    </span>
  );
};

export default LogType;
