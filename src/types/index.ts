// Cart and Item types
export interface CartItem {
  product_id: number;
  quantity: number;
  price: number;
  total_discount?: number;
}

export interface Cart {
  items: CartItem[];
}

export interface UpdatedCart extends Cart {
  total_price: number;
  total_discount: number;
  final_price: number;
}

// Coupon types
export type CouponType = 'cart-wise' | 'product-wise' | 'bxgy';

export interface CartWiseDetails {
  threshold: number;
  discount: number; // percentage
}

export interface ProductWiseDetails {
  product_id: number;
  discount: number; // percentage
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

export type CouponDetails = CartWiseDetails | ProductWiseDetails | BxGyDetails;

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
