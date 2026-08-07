const HASHTAG_RE = /(#[^\s#]+)/g;

const HashtagText = ({ text }: { text: string }) => (
  <>
    {text.split(HASHTAG_RE).map((part, i) =>
      part.startsWith('#') && part.length > 1 ? (
        <span key={i} style={{ color: 'var(--accent)' }}>{part}</span>
      ) : (
        part
      )
    )}
  </>
);

export default HashtagText;
