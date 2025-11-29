// Cart and Item types
export interface CartItem {
  product_id: number;
  quantity: number;
  price: number;
  total_discount?: number;
}

export interface Cart {
  items: CartItem[];
  cart_id?: string; // Optional identifier to track master coupon usage per cart
}

export interface UpdatedCart extends Cart {
  total_price: number;
  total_discount: number;
  final_price: number;
}

// Coupon types
export type CouponType = 'cart-wise' | 'product-wise' | 'bxgy' | 'master';

export type DiscountType = 'percentage' | 'fixed';

export interface CartWiseDetails {
  threshold: number;
  discount: number;
  discount_type: DiscountType; // 'percentage' or 'fixed'
}

export interface ProductWiseDetails {
  product_id: number;
  discount: number;
  discount_type: DiscountType; // 'percentage' or 'fixed'
}

export interface BxGyProduct {
  product_id: number;
  quantity: number;
}

export interface BxGyDetails {
  buy_products: BxGyProduct[];
  get_products: BxGyProduct[];
  repition_limit: number;
}

export interface MasterCouponDetails {
  // Master coupon gives 100% discount, can only be applied once per cart
  // No additional configuration needed
}

export type CouponDetails = CartWiseDetails | ProductWiseDetails | BxGyDetails | MasterCouponDetails;

export interface Coupon {
  id: number;
  type: CouponType;
  details: CouponDetails;
  expiration_date?: string; // ISO date string
  created_at: string;
  updated_at: string;
}

export interface CreateCouponRequest {
  type: CouponType;
  details: CouponDetails;
  expiration_date?: string;
}

export interface ApplicableCoupon {
  coupon_id: number;
  type: CouponType;
  discount: number;
}

export interface ApplicableCouponsResponse {
  applicable_coupons: ApplicableCoupon[];
}

export interface ApplyCouponRequest {
  cart: Cart;
}

export interface ApplyCouponResponse {
  updated_cart: UpdatedCart;
}
