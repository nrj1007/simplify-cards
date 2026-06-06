type Props = {
  issuer: string;
  name: string;
};

// Clean fallback "card face" shown when a card has no imageUrl. Purely presentational —
// it derives everything from the existing issuer/name fields, no new schema.
export default function CardImageFallback({ issuer, name }: Props) {
  return (
    <div className="card-face-fallback" role="img" aria-label={`${name} credit card`}>
      <small>{issuer}</small>
      <strong>{name}</strong>
      <span>Credit Card</span>
    </div>
  );
}
