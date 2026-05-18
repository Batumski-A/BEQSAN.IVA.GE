import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

export default function Materials() {
  const { t } = useTranslation();
  return <StubScreen step="06" title={t('nav.materials')} body={t('stub.materials')} />;
}
