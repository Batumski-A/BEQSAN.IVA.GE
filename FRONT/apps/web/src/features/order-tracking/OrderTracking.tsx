import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { StubScreen } from '@/features/_layout/StubScreen';
import { Seo } from '@/shared/seo/Seo';

export default function OrderTracking() {
  const { t } = useTranslation();
  const params = useParams<{ phone: string; code: string }>();
  return (
    <>
      {/* Private per-order tracking — never index. */}
      <Seo
        noindex
        includeOrg={false}
        canonicalPath="/order"
        title="შეკვეთის სტატუსი | BEQSAN"
        description="შენი შეკვეთის მიმდინარე სტატუსი BEQSAN-ში."
      />
      <StubScreen
        step="05"
        title={`${t('nav.home')} · ${params.code ?? ''}`}
        body={t('stub.orderTracking')}
      />
    </>
  );
}
