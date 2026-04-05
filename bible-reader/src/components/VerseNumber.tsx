interface Props {
  num: number;
}

export function VerseNumber({ num }: Props) {
  return <sup className="verse-number">{num}</sup>;
}
