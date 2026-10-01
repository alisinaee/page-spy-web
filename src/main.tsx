import ReactDOM from 'react-dom/client';
import { App } from './App';
import '@/styles/shadcn.css';
import '@/assets/locales/index';
import './init';

const root = ReactDOM.createRoot(document.querySelector('#root')!);

root.render(<App />);
