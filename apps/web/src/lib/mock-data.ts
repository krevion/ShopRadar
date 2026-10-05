export const categories = [
  'Groceries',
  'Electronics',
  'Home',
  'Beauty',
  'Fashion'
];

export const products: Array<{ id: number; name: string; price: string; stock: string; tag: string }> = [
  { id: 1, name: 'Fresh mangoes', price: 'KSh 180', stock: '24 left', tag: 'Best seller' },
  { id: 2, name: 'Smart LED bulb', price: 'KSh 860', stock: '16 left', tag: 'Popular' },
  { id: 3, name: 'Organic rice', price: 'KSh 520', stock: '38 left', tag: 'Local favorite' },
  { id: 4, name: 'Bluetooth speaker', price: 'KSh 4,300', stock: '9 left', tag: 'New' }
];

export const shops: Array<{ name: string; distance: string; rating: string }> = [
  { name: 'Fresh Harvest', distance: '2.4 km', rating: '4.8' },
  { name: 'Smart Home Kenya', distance: '6.1 km', rating: '4.7' },
  { name: 'Mia Essentials', distance: '3.2 km', rating: '4.9' }
];

export const searchResults: Array<{ label: string; type: string }> = [
  { label: 'Fresh mangoes', type: 'product' },
  { label: 'Fresh Harvest', type: 'shop' },
  { label: 'Mia Essentials', type: 'seller' }
];

export const subscriptionPlans = [
  {
    name: 'Starter',
    price: 'First month free',
    features: ['1 shop listing', 'Basic search', 'KYC check required before approval']
  },
  {
    name: 'Standard Seller',
    price: 'KSh 1,000/month',
    features: ['Unlimited listings', 'Insights dashboard', 'National ID verification required']
  },
  {
    name: 'Growth',
    price: 'KSh 1,000/month + promo boost',
    features: ['Priority exposure', 'Campaign support', 'Business vetting and scam screening']
  }
];

export const adminMetrics = [
  { label: 'Sellers', value: '184' },
  { label: 'Listings', value: '4,260' },
  { label: 'Monthly revenue', value: 'KSh 8.4M' },
  { label: 'Approvals', value: '26 pending' }
];

export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'Shops', href: '/shops' },
  { label: 'Nearby', href: '/nearby' },
  { label: 'Search', href: '/search' },
  { label: 'Videos', href: '/videos' },
  { label: 'Seller', href: '/seller' },
  { label: 'Admin', href: '/admin' },
  { label: 'Account', href: '/account' }
];
