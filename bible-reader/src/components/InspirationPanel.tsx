interface Inspiration {
  label: string;
  sub: string;
  bookAbbrev: string;
  chapter: number;
}

const PASSAGES: Inspiration[] = [
  // Old Testament
  { label: 'Creation',              sub: 'Genesis 1',          bookAbbrev: 'GEN', chapter: 1  },
  { label: 'The Lord is my shepherd', sub: 'Psalm 23',         bookAbbrev: 'PSA', chapter: 23 },
  { label: 'God is our refuge',     sub: 'Psalm 46',           bookAbbrev: 'PSA', chapter: 46 },
  { label: 'I lift my eyes',        sub: 'Psalm 121',          bookAbbrev: 'PSA', chapter: 121 },
  { label: 'Praise',                sub: 'Psalm 100',          bookAbbrev: 'PSA', chapter: 100 },
  { label: 'Trust in the Lord',     sub: 'Proverbs 3',         bookAbbrev: 'PRO', chapter: 3  },
  { label: 'Soar on wings like eagles', sub: 'Isaiah 40',      bookAbbrev: 'ISA', chapter: 40 },
  { label: 'The suffering servant', sub: 'Isaiah 53',          bookAbbrev: 'ISA', chapter: 53 },
  { label: 'Plans to prosper you',  sub: 'Jeremiah 29',        bookAbbrev: 'JER', chapter: 29 },
  // New Testament
  { label: 'Sermon on the Mount',   sub: 'Matthew 5',          bookAbbrev: 'MAT', chapter: 5  },
  { label: "The Lord's Prayer",     sub: 'Matthew 6',          bookAbbrev: 'MAT', chapter: 6  },
  { label: 'In the beginning was the Word', sub: 'John 1',     bookAbbrev: 'JHN', chapter: 1  },
  { label: 'God so loved the world', sub: 'John 3',            bookAbbrev: 'JHN', chapter: 3  },
  { label: 'I am the vine',         sub: 'John 15',            bookAbbrev: 'JHN', chapter: 15 },
  { label: 'Nothing can separate us', sub: 'Romans 8',         bookAbbrev: 'ROM', chapter: 8  },
  { label: 'Love is patient',       sub: '1 Corinthians 13',   bookAbbrev: '1CO', chapter: 13 },
  { label: 'Fruits of the Spirit',  sub: 'Galatians 5',        bookAbbrev: 'GAL', chapter: 5  },
  { label: 'The armor of God',      sub: 'Ephesians 6',        bookAbbrev: 'EPH', chapter: 6  },
  { label: 'I can do all things',   sub: 'Philippians 4',      bookAbbrev: 'PHP', chapter: 4  },
  { label: 'Faith in action',       sub: 'Hebrews 11',         bookAbbrev: 'HEB', chapter: 11 },
  { label: 'All things new',        sub: 'Revelation 21',      bookAbbrev: 'REV', chapter: 21 },
];

interface Props {
  isOpen: boolean;
  onNavigate: (bookAbbrev: string, chapter: number) => void;
  onClose: () => void;
}

export function InspirationPanel({ isOpen, onNavigate, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} />
      <div className="inspiration-panel">
        <div className="inspiration-header">
          <span className="settings-label">Jump to a passage</span>
          <button className="ask-close" onClick={onClose}>✕</button>
        </div>
        <div className="inspiration-list">
          {PASSAGES.map(p => (
            <button
              key={`${p.bookAbbrev}-${p.chapter}`}
              className="inspiration-item"
              onClick={() => { onNavigate(p.bookAbbrev, p.chapter); onClose(); }}
            >
              <span className="inspiration-label">{p.label}</span>
              <span className="inspiration-sub">{p.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
