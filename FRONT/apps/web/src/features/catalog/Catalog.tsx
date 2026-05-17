import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

export default function Catalog() {
  const { t } = useTranslation();
  return <StubScreen step="02" title={t('nav.catalog')} body={t('stub.catalog')} />;
}
