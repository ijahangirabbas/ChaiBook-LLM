import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import type { Message } from '../../types'
import { CitationButton } from './CitationButton'

function renderTextWithCitations(text: string, sources?: Message['sources']) {
  const parts = text.split(/(\[\d+\]|\[Source \d+\])/g)
  return parts.map((part, i) => {
    const match = part.match(/\[(?:Source )?(\d+)\]/)
    if (match) {
      return <CitationButton key={i} sourceNum={parseInt(match[1], 10)} sources={sources} />
    }
    return <span key={i}>{part}</span>
  })
}

export function ProcessedContent({ content, sources }: { content: string; sources?: Message['sources'] }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown
        components={{
          p: ({ children }) => {
            if (typeof children === 'string') {
              return <p className="mb-2 last:mb-0 leading-relaxed">{renderTextWithCitations(children, sources)}</p>
            }
            if (Array.isArray(children) && children.every((c) => typeof c === 'string')) {
              return (
                <p className="mb-2 last:mb-0 leading-relaxed">
                  {renderTextWithCitations(children.join(''), sources)}
                </p>
              )
            }
            return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          },
          li: ({ children }) => {
            if (typeof children === 'string') {
              return <li className="leading-relaxed">{renderTextWithCitations(children, sources)}</li>
            }
            return <li className="leading-relaxed">{children}</li>
          },
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const code = String(children).replace(/\n$/, '')
            if (match) {
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  className="rounded-lg text-xs my-2 !bg-[#0d1117]"
                >
                  {code}
                </SyntaxHighlighter>
              )
            }
            return (
              <code
                className="px-1 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-[12px] font-mono"
                {...props}
              >
                {children}
              </code>
            )
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
