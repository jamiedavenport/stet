import { brand } from '@repo/brand';
import { AuthorMark } from '@repo/brand/author-mark';
import { BrandMark } from '@repo/brand/mark';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { appName, githubUrl } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <BrandMark className="size-5" />
          {appName}
        </>
      ),
    },
    links: [
      {
        type: 'icon',
        label: `Built by ${brand.author.name}`,
        icon: <AuthorMark className="size-4" />,
        text: brand.author.name,
        url: brand.author.url,
        external: true,
      },
    ],
    githubUrl,
  };
}
