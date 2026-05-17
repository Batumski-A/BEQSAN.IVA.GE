import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';

export default function Contact() {
  const { t } = useTranslation();
  return <StubScreen step="04" title={t('nav.contact')} body={t('stub.contact')} />;
}
