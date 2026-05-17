import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import { AppRouter } from '@/app/router';

export function App() {
  const { i18n } = useTranslation();

  return (
    <>
      <Helmet>
        <html lang={i18n.language || 'ka'} />
        <title>BEQSAN — ხელით აწყობილი კარფანჯრები ბათუმის ფაბრიკაში</title>
      </Helmet>
      <AppRouter />
    </>
  );
}
