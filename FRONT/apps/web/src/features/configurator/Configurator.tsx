import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

export default function Configurator() {
  const { t } = useTranslation();
  return <StubScreen step="01" title={t('nav.configurator')} body={t('stub.configurator')} />;
}
