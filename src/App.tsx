import { I18nProvider } from './ui/i18n/context';
import { PipeLossCalculator } from './ui/features/PipeLossCalculator';

export default function App() {
  return (
    <I18nProvider defaultLocale="ja">
      <PipeLossCalculator />
    </I18nProvider>
  );
}
