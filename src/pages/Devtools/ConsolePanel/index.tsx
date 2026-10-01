import { HeaderActions } from './components/HeaderActions';
import { MainContent } from './components/MainContent';
import { FooterInput } from './components/FooterInput';
import { ErrorDetailDrawer } from '@/components/ErrorDetailDrawer';

const ConsolePanel = () => {
  return (
    <div className="console-panel flex h-full min-h-0 flex-col">
      <HeaderActions />
      <div className="flex min-h-0 flex-1">
        <MainContent />
        <ErrorDetailDrawer />
      </div>
      <FooterInput />
    </div>
  );
};

export default ConsolePanel;
