/* eslint-disable no-underscore-dangle */
import { HeaderActions } from './components/HeaderActions';
import { MainContent } from './components/MainContent';
import { FooterInput } from './components/FooterInput';
import { ErrorDetailDrawer } from '@/components/ErrorDetailDrawer';
const ConsolePanel = () => {
  return (
    <div className="console-panel flex flex-col">
      <HeaderActions />
      <div className="console-panel__content relative flex flex-col flex-1 h-0 mt-2 bg-card rounded-sm">
        <MainContent />
        <FooterInput />
      </div>
      <ErrorDetailDrawer />
    </div>
  );
};

export default ConsolePanel;
