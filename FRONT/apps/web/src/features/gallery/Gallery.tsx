import { useTranslation } from 'react-i18next';
import { StubScreen } from '@/features/_layout/StubScreen';
import { Seo } from '@/shared/seo/Seo';

export default function Gallery() {
  const { t } = useTranslation();
  return (
    <>
      <Seo
        route="/gallery"
        breadcrumb={[
          { name: 'მთავარი', path: '/' },
          { name: 'გალერეა', path: '/gallery' },
        ]}
      />
      <StubScreen step="03" title={t('nav.gallery')} body={t('stub.gallery')} />
    </>
  );
}
