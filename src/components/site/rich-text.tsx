import ReactMarkdown from "react-markdown";

/** Renders trusted CMS markdown content with QASADAN rich-text styling. */
export function RichText({ content }: { content: string }) {
  return (
    <div className="rich-text">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
