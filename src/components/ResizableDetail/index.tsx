import { useCacheDetailStore } from '@/store/cache-detail';
import { GripHorizontal } from 'lucide-react';
import ReactJsonView from '@huolala-tech/react-json-view';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Resizable } from 'react-resizable';
import './index.less';

export const ResizableDetail = () => {
  const { t } = useTranslation();

  const detailInfo = useCacheDetailStore((state) => state.currentDetail);
  const [detailSize, setDetailSize] = useState(100);

  return (
    <Resizable
      axis="y"
      resizeHandles={['n']}
      height={detailSize}
      handle={
        <div className="resizable-height-controller flex items-center justify-center cursor-row-resize">
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
      }
      onResize={(_, info) => {
        const { height } = info.size;
        if (height > 500 || height < 50) return;

        setDetailSize(height);
      }}
    >
      <div className="resizable-detail">
        <div style={{ height: detailSize, overflowY: 'auto', padding: 8 }}>
          {detailInfo ? (
            <ReactJsonView source={detailInfo} defaultExpand />
          ) : (
            <div className="resizable-empty-detail">
              {t('storage.empty-detail')}
            </div>
          )}
        </div>
      </div>
    </Resizable>
  );
};
