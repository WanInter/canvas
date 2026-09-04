'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

const QR_CODE_SIZE = 220;

export function QRCodeImage({ alt, value }: Readonly<{ alt: string; value: string }>) {
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setDataUrl('');
    setError('');
    QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, scale: 8, width: QR_CODE_SIZE })
      .then((nextDataUrl) => {
        if (!cancelled) setDataUrl(nextDataUrl);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to render QR code');
      });
    return () => { cancelled = true; };
  }, [value]);

  if (error) {
    return <div className="mx-auto flex h-[220px] w-[220px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">{error}</div>;
  }
  if (!dataUrl) {
    return <div className="mx-auto h-[220px] w-[220px] animate-pulse rounded-2xl bg-[#eef0fb] motion-reduce:animate-none" aria-label={alt} />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- QR codes are generated client-side data URLs.
  return <img src={dataUrl} alt={alt} width={QR_CODE_SIZE} height={QR_CODE_SIZE} className="mx-auto h-[220px] w-[220px]" />;
}
