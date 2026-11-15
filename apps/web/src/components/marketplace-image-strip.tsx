import Image from 'next/image';

const marketplaceImages = [
  {
    src: '/images/marketplace/local-shop.jpg',
    alt: 'Clothing racks and displays inside a local retail shop',
    caption: 'Discover local shops'
  },
  {
    src: '/images/marketplace/checkout.jpg',
    alt: 'A customer paying for a purchase at checkout',
    caption: 'Shop with confidence'
  }
];

export function MarketplaceImageStrip() {
  return (
    <section className="marketplace-image-strip" aria-label="Shopping and local businesses">
      {marketplaceImages.map((image) => (
        <figure className="marketplace-image-card" key={image.src}>
          <Image
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 50vw, 600px"
            style={{ objectFit: 'cover' }}
          />
          <figcaption>{image.caption}</figcaption>
        </figure>
      ))}
    </section>
  );
}
