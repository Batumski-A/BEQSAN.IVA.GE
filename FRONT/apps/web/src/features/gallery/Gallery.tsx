import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

export default function Gallery() {
  const { t } = useTranslation();
  return <StubScreen step="03" title={t('nav.gallery')} body={t('stub.gallery')} />;
}
