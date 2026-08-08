import { categoryFocusConfigs } from './lib/recommend-category-focus';
const e = categoryFocusConfigs.find(c => c.key === "entertainment")!;
console.log(e.spendCategory);
