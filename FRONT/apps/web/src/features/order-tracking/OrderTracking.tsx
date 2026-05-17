import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { StubScreen } from '@/features/_layout/StubScreen';

export default function OrderTracking() {
  const { t } = useTranslation();
  const params = useParams<{ phone: string; code: string }>();
  return (
    <StubScreen
      step="05"
      title={`${t('nav.home')} · ${params.code ?? ''}`}
      body={t('stub.orderTracking')}
    />
  );
}
