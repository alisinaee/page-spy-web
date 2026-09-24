import { Input, Modal } from 'antd';

export const confirmLogFileName = (defaultName: string) =>
  new Promise<string | null>((resolve) => {
    let value = defaultName;
    Modal.confirm({
      title: 'Save logs',
      icon: null,
      content: (
        <Input
          autoFocus
          defaultValue={defaultName}
          onChange={(event) => {
            value = event.target.value;
          }}
        />
      ),
      okText: 'Save',
      cancelText: 'Cancel',
      onOk: () => resolve((value || defaultName).trim() || defaultName),
      onCancel: () => resolve(null),
    });
  });
