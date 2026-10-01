import ReactDOM from 'react-dom/client';
import { App } from './App';
import '@/assets/style/union.less';
import '@/assets/style/initial.less';
import '@/styles/shadcn.css';
import '@/assets/locales/index';
import './init';

document.documentElement.classList.add('dark');

const root = ReactDOM.createRoot(document.querySelector('#root')!);

root.render(<App />);
