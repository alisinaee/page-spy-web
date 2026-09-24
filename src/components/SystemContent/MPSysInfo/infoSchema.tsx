import { last } from 'lodash-es';

export interface InfoItem {
  keys: string[]; // the key maybe different in different platform
  label: string;
  render?: (props: { value: any }) => JSX.Element;
  icon?: React.ReactNode;
}

export const DeviceInfo: InfoItem[] = [
  {
    keys: ['SDKVersion'],
    label: 'Client SDK Version',
  },
  {
    keys: ['pixelRatio'],
    label: 'Device Pixel Ratio',
  },
  {
    keys: ['screenWidth'],
    label: 'Screen Width',
  },
  {
    keys: ['screenHeight'],
    label: 'Screen Height',
  },
  {
    keys: ['windowWidth'],
    label: 'Usable Window Width',
  },
  {
    keys: ['windowHeight'],
    label: 'Usable Window Height',
  },
  {
    keys: ['statusBarHeight'],
    label: 'Status Bar Height',
  },
  {
    keys: ['language'],
    label: 'Current Language',
  },
  {
    keys: ['platform'],
    label: 'Client Platform',
  },
  {
    keys: ['fontSizeSetting'],
    label: 'User Font Scale',
  },

  {
    keys: ['benchmarkLevel'],
    label: 'Performance Level',
  },
  //  {
  //   keys: ['safeArea'],
  //   label: '安全区域',
  //   render: ({value}) => {
  //     return <div style={{background: '#eee', borderRadius: 6, padding: '4px 12px'}}>
  //       <p>top: {value.top}</p>
  //       <p>left: {value.left}</p>
  //       <p>right: {value.right}</p>
  //       <p>bottom: {value.bottom}</p>
  //       <p>width: {value.width}</p>
  //       <p>height: {value.height}</p>
  //     </div>
  //   }
  // },

  {
    keys: ['theme'],
    label: 'Current System Theme',
  },

  {
    keys: ['enableDebug'],
    label: 'Debug Mode Enabled',
  },
];

export const SysInfo: InfoItem[] = [
  {
    keys: ['bluetoothEnabled'],
    label: 'Bluetooth Enabled',
  },
  {
    keys: ['locationEnabled'],
    label: 'Location Services Enabled',
  },
  {
    keys: ['wifiEnabled'],
    label: 'Wi-Fi Enabled',
  },
  {
    keys: ['deviceOrientation'],
    label: 'Device Orientation',
  },
];

export const AppAuthSettings: InfoItem[] = [
  {
    keys: ['albumAuthorized'],
    label: 'Photo Library Access (iOS)',
  },
  {
    keys: ['cameraAuthorized'],
    label: 'Camera Access',
  },
  {
    keys: ['locationAuthorized'],
    label: 'Location Access',
  },
  {
    keys: ['locationReducedAccuracy'],
    label: 'Precise Location (iOS)',
  },
  {
    keys: ['microphoneAuthorized'],
    label: 'Microphone Access',
  },
  {
    keys: ['notificationAuthorized'],
    label: 'Notifications Allowed',
  },
  {
    keys: ['notificationAlertAuthorized'],
    label: 'Alert Notifications (iOS)',
  },
  {
    keys: ['notificationBadgeAuthorized'],
    label: 'Badge Notifications (iOS)',
  },
  {
    keys: ['notificationSoundAuthorized'],
    label: 'Sound Notifications (iOS)',
  },
  {
    keys: ['phoneCalendarAuthorized'],
    label: 'Calendar Access',
  },
];

export const AuthInfo: InfoItem[] = [
  {
    keys: ['scope.hostId'],
    label: 'Authorized TikTok ID',
  },
  {
    keys: ['scope.userLocation', 'userLocation'],
    label: 'Precise Location',
  },
  {
    keys: ['scope.userFuzzyLocation', 'userFuzzyLocation'],
    label: 'Approximate Location',
  },
  {
    keys: ['scope.userLocationBackground', 'userLocationBackground'],
    label: 'Background Location',
  },
  {
    keys: ['scope.record', 'record'],
    label: 'Microphone',
  },
  {
    keys: ['scope.camera', 'camera'],
    label: 'Camera',
  },
  {
    keys: ['scope.bluetooth', 'bluetooth'],
    label: 'Bluetooth',
  },
  {
    keys: ['scope.writePhotosAlbum', 'writePhotosAlbum'],
    label: 'Add to Photo Library',
  },
  {
    keys: ['scope.album'],
    label: 'Read Photo Library',
  },
  {
    keys: ['scope.addPhoneContact', 'addPhoneContact'],
    label: 'Add to Contacts',
  },
  {
    keys: ['scope.addPhoneCalendar', 'addPhoneCalendar', 'scope.calendar'],
    label: 'Add Calendar Event',
  },
  {
    keys: ['scope.werun', 'werun'],
    label: 'WeChat Steps',
  },
  {
    keys: ['scope.address', 'address'],
    label: 'Contact Address',
  },
  {
    keys: ['scope.invoiceTitle', 'invoiceTitle'],
    label: 'Invoice Title',
  },
  {
    keys: ['scope.invoice', 'invoice'],
    label: 'Access Invoices',
  },
  {
    keys: ['scope.userInfo', 'userInfo'],
    label: 'User Information',
  },
  {
    keys: ['scope.clipboard'],
    label: 'Clipboard',
  },
];
