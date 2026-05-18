import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

export default function Process() {
  const { t } = useTranslation();
  return <StubScreen step="05" title={t('nav.process')} body={t('stub.process')} />;
}
