import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

export default function Warranty() {
  const { t } = useTranslation();
  return <StubScreen step="07" title={t('nav.warranty')} body={t('stub.warranty')} />;
}
