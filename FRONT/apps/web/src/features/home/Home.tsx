import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

// Real Industrial-Elegance hero lands in the next commit; this is a placeholder
// so the route graph compiles when we wire up routing alone.
export default function Home() {
  const { t } = useTranslation();
  return <StubScreen step="00" title="BEQSAN" body={t('home.heroSub')} />;
}
