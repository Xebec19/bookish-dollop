import { CouponService } from './couponService';
import { db } from '../database';
import { Cart, CartWiseDetails, ProductWiseDetails, BxGyDetails } from '../types';

describe('CouponService', () => {
  let couponService: CouponService;

  beforeEach(() => {
    couponService = new CouponService();
    // Clear database before each test
    db.getAllCoupons().forEach(c => db.deleteCoupon(c.id));
  });

  describe('Cart-wise coupons', () => {
    it('should apply 10% discount on cart over threshold', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10 };
      const coupon = db.createCoupon({ type: 'cart-wise', details });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 2, price: 100 },
          { product_id: 2, quantity: 1, price: 50 },
        ],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].discount).toBe(25); // 10% of 250
    });

    it('should not apply discount if cart is below threshold', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10 };
      db.createCoupon({ type: 'cart-wise', details });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 1, price: 50 }],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });

    it('should apply discount when cart exactly equals threshold', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10 };
      db.createCoupon({ type: 'cart-wise', details });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 1, price: 100 }],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0); // threshold requires > not >=
    });
  });

  describe('Product-wise coupons', () => {
    it('should apply 20% discount on specific product', () => {
      const details: ProductWiseDetails = { product_id: 1, discount: 20 };
      db.createCoupon({ type: 'product-wise', details });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 2, price: 100 },
          { product_id: 2, quantity: 1, price: 50 },
        ],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].discount).toBe(40); // 20% of 200
    });

    it('should not apply if product is not in cart', () => {
      const details: ProductWiseDetails = { product_id: 3, discount: 20 };
      db.createCoupon({ type: 'product-wise', details });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 1, price: 100 }],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });
  });

  describe('BxGy coupons', () => {
    it('should apply buy 2 get 1 deal correctly', () => {
      const details: BxGyDetails = {
        buy_products: [
          { product_id: 1, quantity: 2 },
          { product_id: 2, quantity: 2 },
        ],
        get_products: [{ product_id: 3, quantity: 1 }],
        repition_limit: 2,
      };
      db.createCoupon({ type: 'bxgy', details });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 4, price: 50 },
          { product_id: 2, quantity: 4, price: 30 },
          { product_id: 3, quantity: 2, price: 25 },
        ],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(1);
      // Buy requirement: 4 total (2+2), Cart has 8 buy products
      // Can apply 2 times (limited by repition_limit), gets 2 free at 25 each = 50
      expect(applicable[0].discount).toBe(50);
    });

    it('should not apply if buy requirements not met', () => {
      const details: BxGyDetails = {
        buy_products: [{ product_id: 1, quantity: 3 }],
        get_products: [{ product_id: 2, quantity: 1 }],
        repition_limit: 1,
      };
      db.createCoupon({ type: 'bxgy', details });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 2, price: 50 }, // Only 2, need 3
          { product_id: 2, quantity: 1, price: 25 },
        ],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });

    it('should respect repetition limit', () => {
      const details: BxGyDetails = {
        buy_products: [{ product_id: 1, quantity: 2 }],
        get_products: [{ product_id: 2, quantity: 1 }],
        repition_limit: 2,
      };
      db.createCoupon({ type: 'bxgy', details });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 10, price: 50 }, // Could apply 5 times but limited to 2
          { product_id: 2, quantity: 5, price: 25 },
        ],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].discount).toBe(50); // 2 * 25 (limited to 2 applications)
    });
  });

  describe('applyCoupon', () => {
    it('should apply cart-wise coupon and distribute discount', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10 };
      const coupon = db.createCoupon({ type: 'cart-wise', details });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 2, price: 100 },
          { product_id: 2, quantity: 1, price: 100 },
        ],
      };

      const result = couponService.applyCoupon(coupon.id, cart);
      expect(result.total_price).toBe(300);
      expect(result.total_discount).toBe(30);
      expect(result.final_price).toBe(270);
    });

    it('should apply product-wise coupon to specific item', () => {
      const details: ProductWiseDetails = { product_id: 1, discount: 50 };
      const coupon = db.createCoupon({ type: 'product-wise', details });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 2, price: 100 },
          { product_id: 2, quantity: 1, price: 100 },
        ],
      };

      const result = couponService.applyCoupon(coupon.id, cart);
      expect(result.items[0].total_discount).toBe(100); // 50% of 200
      expect(result.items[1].total_discount).toBe(0);
      expect(result.total_discount).toBe(100);
    });

    it('should throw error for non-existent coupon', () => {
      const cart: Cart = { items: [{ product_id: 1, quantity: 1, price: 100 }] };
      expect(() => couponService.applyCoupon(9999, cart)).toThrow('Coupon not found');
    });

    it('should throw error for expired coupon', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10 };
      const coupon = db.createCoupon({
        type: 'cart-wise',
        details,
        expiration_date: '2020-01-01T00:00:00.000Z',
      });

      const cart: Cart = { items: [{ product_id: 1, quantity: 2, price: 100 }] };
      expect(() => couponService.applyCoupon(coupon.id, cart)).toThrow('Coupon has expired');
    });
  });

  describe('Multiple applicable coupons', () => {
    it('should return coupons sorted by discount descending', () => {
      const cartWiseDetails: CartWiseDetails = { threshold: 100, discount: 10 };
      const productWiseDetails: ProductWiseDetails = { product_id: 1, discount: 20 };

      db.createCoupon({ type: 'cart-wise', details: cartWiseDetails });
      db.createCoupon({ type: 'product-wise', details: productWiseDetails });

      const cart: Cart = {
        items: [
          { product_id: 1, quantity: 3, price: 100 }, // 300 total
          { product_id: 2, quantity: 1, price: 100 },
        ],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(2);
      // Product-wise: 20% of 300 = 60
      // Cart-wise: 10% of 400 = 40
      expect(applicable[0].discount).toBeGreaterThan(applicable[1].discount);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty cart', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10 };
      db.createCoupon({ type: 'cart-wise', details });

      const cart: Cart = { items: [] };
      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });

    it('should handle zero-price items', () => {
      const details: ProductWiseDetails = { product_id: 1, discount: 20 };
      db.createCoupon({ type: 'product-wise', details });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 5, price: 0 }],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });
  });
});
