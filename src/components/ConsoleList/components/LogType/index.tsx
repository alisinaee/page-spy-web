import React from 'react';
import ErrorSvg from '@/assets/image/error.svg?react';
import InfoSvg from '@/assets/image/info.svg?react';
import WarnSvg from '@/assets/image/warn.svg?react';
import DebugOriginSvg from '@/assets/image/debug-origin.svg?react';
import DebugEvalSvg from '@/assets/image/debug-eval.svg?react';
import UserSvg from '@/assets/image/user.svg?react';
import DebugSvg from '@/assets/image/debug.svg?react';
import './index.less';
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
    color: '#3683F9',
    icon: InfoSvg,
  },
  error: {
    color: '#D7423F',
    icon: ErrorSvg,
  },
  warn: {
    color: '#E9994B',
    icon: WarnSvg,
  },
  debug: {
    color: '#8236CB',
    icon: DebugSvg,
  },
  'debug-origin': {
    color: '#8236CB',
    icon: DebugOriginSvg,
  },
  'debug-eval': {
    color: '#8236CB',
    icon: DebugEvalSvg,
  },
  default: {
    color: '#000000',
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
    <div className="log-type">
      <div
        className="log-type__icon flex items-center justify-center"
        title={logType}
      >
        {IconComp && <IconComp style={{ width: 14, height: 14 }} />}
      </div>
    </div>
  );
};

export default LogType;
