import Image from 'next/image';

const categoryImages: Array<{ keywords: string[]; src: string }> = [
  { keywords: ['footwear', 'shoe', 'sneaker', 'trainer'], src: '/images/catalog/footwear.jpg' },
  { keywords: ['watch', 'jewelry', 'jewellery'], src: '/images/catalog/watches.jpg' },
  { keywords: ['laptop', 'computer', 'phone', 'gadget', 'camera'], src: '/images/catalog/tech.jpg' },
  { keywords: ['interior', 'furniture', 'decor', 'living'], src: '/images/catalog/interiors.jpg' },
  { keywords: ['skincare', 'skin care'], src: '/images/catalog/skincare.jpg' },
  { keywords: ['coffee', 'cafe', 'tea', 'bakery'], src: '/images/catalog/coffee.jpg' },
  { keywords: ['electronic', 'audio', 'phone', 'computer', 'tech'], src: '/images/catalog/electronics.jpg' },
  { keywords: ['fashion', 'cloth', 'clothing', 'apparel'], src: '/images/catalog/fashion.jpg' },
  { keywords: ['beauty', 'skin', 'cosmetic', 'makeup'], src: '/images/catalog/beauty.jpg' },
  { keywords: ['home', 'furniture', 'decor', 'living'], src: '/images/catalog/home.jpg' },
  { keywords: ['grocery', 'food', 'produce', 'fruit', 'vegetable'], src: '/images/catalog/groceries.jpg' }
];

type CatalogImageProps = {
  category: string;
  height?: number;
  rounded?: boolean;
};

export function CatalogImage({ category, height = 160, rounded = false }: CatalogImageProps) {
  const normalizedCategory = category.toLowerCase();
  const image = categoryImages.find(({ keywords }) => keywords.some((keyword) => normalizedCategory.includes(keyword)))
    ?? categoryImages[categoryImages.length - 1];

  return (
    <div className={`catalog-photo${rounded ? ' is-rounded' : ''}`} style={{ height }}>
      <Image
        src={image.src}
        alt={`Illustrative ${category} product photography`}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw"
        style={{ objectFit: 'cover' }}
      />
      <span className="catalog-photo-label">{category}</span>
    </div>
  );
}
