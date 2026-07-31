import { generateContent } from '@stetcms/next';

export default async function Home() {
  const content = await generateContent();
  return (
    <main>
      <h1>{content.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: content.html }} />
    </main>
  );
}
