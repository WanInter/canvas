'use client';

import { parseAnnouncementBody } from '@/lib/announcementUtils';

type AnnouncementBodyProps = Readonly<{
  body: string;
  className?: string;
}>;

export function AnnouncementBody({ body, className }: AnnouncementBodyProps) {
  const parsed = parseAnnouncementBody(body);

  return (
    <div className={className}>
      {parsed.map((segment, idx) => {
        if (segment.type === 'text') {
          return <span key={idx}>{segment.content}</span>;
        }
        if (segment.type === 'image') {
          return (
            <img
              key={idx}
              src={segment.content}
              alt=""
              className="max-w-full rounded"
              style={{ maxHeight: '400px' }}
            />
          );
        }
        return null;
      })}
    </div>
  );
}
