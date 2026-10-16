import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Imported image URLs remain explicit links; reading a PRD must not load tracking pixels.
export function MarkdownText({ children }: { children: string }) {
  return <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
    a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({ src, alt }) => <a href={src} target="_blank" rel="noopener noreferrer">图片：{alt || '打开图片'}</a>,
  }}>{children}</Markdown>;
}
