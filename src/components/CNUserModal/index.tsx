import { isClient } from '@/utils/constants';
import { Button, Modal } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import RunSvg from '@/assets/image/run-right.svg?react';
import Icon from '@ant-design/icons';

const CACHE_NAME = 'page-spy-do-not-open-mirror-modal';
export const OFFICIAL_SITE = /^(w{3}.)?pagespy\.org$/;
const CN_MIRROR_SITE = 'https://pagespy.huolala.cn';

const LOAD_TIME_IS_TOO_LONG =
  typeof performance.now === 'function' && performance.now() > 5000;

export const CNUserModal = () => {
  const [open, setOpen] = useState(() => {
    const { host } = location;
    if (isClient || !OFFICIAL_SITE.test(host) || !LOAD_TIME_IS_TOO_LONG)
      return false;
    // return true;

    const beforeOpenTime = localStorage[CACHE_NAME];
    if (beforeOpenTime) {
      const before = dayjs(beforeOpenTime);
      const now = dayjs();
      const diffDays = now.diff(before, 'day');
      if (diffDays < 7) {
        return false;
      }
    }

    return true;
  });

  return (
    <Modal
      open={open}
      title="Performance tip"
      maskClosable={false}
      onCancel={() => {
        setOpen(false);
      }}
      footer={[
        <Button
          key="close"
          onClick={() => {
            localStorage.setItem(CACHE_NAME, new Date().toString());
            setOpen(false);
          }}
        >
          Don&apos;t show again for 7 days
        </Button>,
        <Button
          key="go"
          type="primary"
          icon={<Icon component={RunSvg} />}
          onClick={() => {
            window.location.href = CN_MIRROR_SITE;
          }}
        >
          Go to mirror
        </Button>,
      ]}
    >
      <p style={{ marginBlock: 24, fontSize: 16 }}>
        Users in mainland China may get better performance from the China
        mirror.
      </p>
    </Modal>
  );
};
