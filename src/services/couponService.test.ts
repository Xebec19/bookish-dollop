import { CouponService } from './couponService';
import { db } from '../database';
import { Cart, CartWiseDetails, ProductWiseDetails, BxGyDetails } from '../types';

describe('CouponService', () => {
  let couponService: CouponService;
  let couponCodeCounter = 0;

  const generateCouponCode = () => {
    return `TEST${++couponCodeCounter}`;
  };

  beforeEach(() => {
    couponService = new CouponService();
    couponCodeCounter = 0;
    // Clear database before each test
    db.getAllCoupons().forEach(c => db.deleteCoupon(c.id));
  });

  describe('Cart-wise coupons', () => {
    it('should apply 10% discount on cart over threshold', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10, discount_type: 'percentage' };
      const coupon = db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

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
      const details: CartWiseDetails = { threshold: 100, discount: 10, discount_type: 'percentage' };
      db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 1, price: 50 }],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });

    it('should apply discount when cart exactly equals threshold', () => {
      const details: CartWiseDetails = { threshold: 100, discount: 10, discount_type: 'percentage' };
      db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 1, price: 100 }],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0); // threshold requires > not >=
    });
  });

  describe('Product-wise coupons', () => {
    it('should apply 20% discount on specific product', () => {
      const details: ProductWiseDetails = { product_id: 1, discount: 20, discount_type: 'percentage' };
      db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details });

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
      const details: ProductWiseDetails = { product_id: 3, discount: 20, discount_type: 'percentage' };
      db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details });

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
      db.createCoupon({ code: generateCouponCode(), type: 'bxgy', details });

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
      db.createCoupon({ code: generateCouponCode(), type: 'bxgy', details });

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
      db.createCoupon({ code: generateCouponCode(), type: 'bxgy', details });

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
      const details: CartWiseDetails = { threshold: 100, discount: 10, discount_type: 'percentage' };
      const coupon = db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

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
      const details: ProductWiseDetails = { product_id: 1, discount: 50, discount_type: 'percentage' };
      const coupon = db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details });

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
      const details: CartWiseDetails = { threshold: 100, discount: 10, discount_type: 'percentage' };
      const coupon = db.createCoupon({
        code: generateCouponCode(),
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
      const cartWiseDetails: CartWiseDetails = { threshold: 100, discount: 10, discount_type: 'percentage' };
      const productWiseDetails: ProductWiseDetails = { product_id: 1, discount: 20, discount_type: 'percentage' };

      db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details: cartWiseDetails });
      db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details: productWiseDetails });

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
      const details: CartWiseDetails = { threshold: 100, discount: 10, discount_type: 'percentage' };
      db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

      const cart: Cart = { items: [] };
      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });

    it('should handle zero-price items', () => {
      const details: ProductWiseDetails = { product_id: 1, discount: 20, discount_type: 'percentage' };
      db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 5, price: 0 }],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(0);
    });
  });

  describe('Fixed price discounts', () => {
    describe('Cart-wise fixed discount', () => {
      it('should apply fixed discount to cart above threshold', () => {
        const details: CartWiseDetails = {
          threshold: 100,
          discount: 50,
          discount_type: 'fixed'
        };
        const coupon = db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

        const cart: Cart = {
          items: [
            { product_id: 1, quantity: 2, price: 100 },
            { product_id: 2, quantity: 1, price: 50 },
          ],
        };

        const applicable = couponService.getApplicableCoupons(cart);
        expect(applicable).toHaveLength(1);
        expect(applicable[0].discount).toBe(50); // Fixed Rs. 50 off
      });

      it('should cap fixed discount at cart total', () => {
        const details: CartWiseDetails = {
          threshold: 10,
          discount: 1000,
          discount_type: 'fixed'
        };
        const coupon = db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

        const cart: Cart = {
          items: [{ product_id: 1, quantity: 1, price: 100 }],
        };

        const applicable = couponService.getApplicableCoupons(cart);
        expect(applicable).toHaveLength(1);
        expect(applicable[0].discount).toBe(100); // Capped at cart total
      });

      it('should distribute fixed discount proportionally across items', () => {
        const details: CartWiseDetails = {
          threshold: 50,
          discount: 60,
          discount_type: 'fixed'
        };
        const coupon = db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

        const cart: Cart = {
          items: [
            { product_id: 1, quantity: 1, price: 100 }, // 50% of total
            { product_id: 2, quantity: 1, price: 100 }, // 50% of total
          ],
        };

        const result = couponService.applyCoupon(coupon.id, cart);
        expect(result.total_discount).toBe(60);
        expect(result.items[0].total_discount).toBe(30);
        expect(result.items[1].total_discount).toBe(30);
        expect(result.final_price).toBe(140);
      });
    });

    describe('Product-wise fixed discount', () => {
      it('should apply fixed discount to specific product', () => {
        const details: ProductWiseDetails = {
          product_id: 1,
          discount: 30,
          discount_type: 'fixed'
        };
        const coupon = db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details });

        const cart: Cart = {
          items: [
            { product_id: 1, quantity: 2, price: 100 },
            { product_id: 2, quantity: 1, price: 50 },
          ],
        };

        const applicable = couponService.getApplicableCoupons(cart);
        expect(applicable).toHaveLength(1);
        expect(applicable[0].discount).toBe(30); // Fixed Rs. 30 off on product 1
      });

      it('should cap fixed discount at product total', () => {
        const details: ProductWiseDetails = {
          product_id: 1,
          discount: 500,
          discount_type: 'fixed'
        };
        const coupon = db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details });

        const cart: Cart = {
          items: [
            { product_id: 1, quantity: 2, price: 50 }, // Total: 100
            { product_id: 2, quantity: 1, price: 100 },
          ],
        };

        const applicable = couponService.getApplicableCoupons(cart);
        expect(applicable).toHaveLength(1);
        expect(applicable[0].discount).toBe(100); // Capped at product total
      });

      it('should apply fixed discount to product with quantity > 1', () => {
        const details: ProductWiseDetails = {
          product_id: 1,
          discount: 40,
          discount_type: 'fixed'
        };
        const coupon = db.createCoupon({ code: generateCouponCode(), type: 'product-wise', details });

        const cart: Cart = {
          items: [
            { product_id: 1, quantity: 5, price: 20 }, // Total: 100
            { product_id: 2, quantity: 1, price: 50 },
          ],
        };

        const result = couponService.applyCoupon(coupon.id, cart);
        expect(result.items[0].total_discount).toBe(40);
        expect(result.total_discount).toBe(40);
        expect(result.final_price).toBe(110);
      });
    });

    describe('Percentage vs Fixed comparison', () => {
      it('should apply percentage discount correctly', () => {
        const details: CartWiseDetails = {
          threshold: 50,
          discount: 10,
          discount_type: 'percentage'
        };
        db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

        const cart: Cart = {
          items: [{ product_id: 1, quantity: 1, price: 200 }],
        };

        const applicable = couponService.getApplicableCoupons(cart);
        expect(applicable[0].discount).toBe(20); // 10% of 200
      });

      it('should apply fixed discount correctly', () => {
        const details: CartWiseDetails = {
          threshold: 50,
          discount: 10,
          discount_type: 'fixed'
        };
        db.createCoupon({ code: generateCouponCode(), type: 'cart-wise', details });

        const cart: Cart = {
          items: [{ product_id: 1, quantity: 1, price: 200 }],
        };

        const applicable = couponService.getApplicableCoupons(cart);
        expect(applicable[0].discount).toBe(10); // Fixed Rs. 10 off
      });
    });
  });

  describe('Master coupons', () => {
    it('should apply 100% discount to entire cart', () => {
      const coupon = db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      const cart: Cart = {
        cart_id: 'cart_123',
        items: [
          { product_id: 1, quantity: 2, price: 100 },
          { product_id: 2, quantity: 3, price: 50 },
        ],
      };

      const result = couponService.applyCoupon(coupon.id, cart);
      expect(result.total_price).toBe(350);
      expect(result.total_discount).toBe(350);
      expect(result.final_price).toBe(0);
    });

    it('should distribute 100% discount across all items', () => {
      const coupon = db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      const cart: Cart = {
        cart_id: 'cart_456',
        items: [
          { product_id: 1, quantity: 1, price: 100 },
          { product_id: 2, quantity: 1, price: 50 },
        ],
      };

      const result = couponService.applyCoupon(coupon.id, cart);
      expect(result.items[0].total_discount).toBe(100);
      expect(result.items[1].total_discount).toBe(50);
    });

    it('should show master coupon in applicable coupons list', () => {
      db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      const cart: Cart = {
        cart_id: 'cart_789',
        items: [
          { product_id: 1, quantity: 1, price: 200 },
        ],
      };

      const applicable = couponService.getApplicableCoupons(cart);
      expect(applicable).toHaveLength(1);
      expect(applicable[0].type).toBe('master');
      expect(applicable[0].discount).toBe(200); // Full cart value
    });

    it('should not allow master coupon to be applied twice to same cart', () => {
      const coupon = db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      const cart: Cart = {
        cart_id: 'cart_same',
        items: [{ product_id: 1, quantity: 1, price: 100 }],
      };

      // First application - should succeed
      const result1 = couponService.applyCoupon(coupon.id, cart);
      expect(result1.final_price).toBe(0);

      // Second application - should fail
      expect(() => {
        couponService.applyCoupon(coupon.id, cart);
      }).toThrow('Master coupon has already been used for this cart');
    });

    it('should allow master coupon for different carts', () => {
      const coupon = db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      const cart1: Cart = {
        cart_id: 'cart_user1',
        items: [{ product_id: 1, quantity: 1, price: 100 }],
      };

      const cart2: Cart = {
        cart_id: 'cart_user2',
        items: [{ product_id: 1, quantity: 1, price: 150 }],
      };

      // Both should succeed
      const result1 = couponService.applyCoupon(coupon.id, cart1);
      const result2 = couponService.applyCoupon(coupon.id, cart2);

      expect(result1.final_price).toBe(0);
      expect(result2.final_price).toBe(0);
    });

    it('should use default cart_id if not provided', () => {
      const coupon = db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      const cart: Cart = {
        items: [{ product_id: 1, quantity: 1, price: 100 }],
      };

      // First application
      const result1 = couponService.applyCoupon(coupon.id, cart);
      expect(result1.final_price).toBe(0);

      // Second application should fail (same default cart_id)
      expect(() => {
        couponService.applyCoupon(coupon.id, cart);
      }).toThrow('Master coupon has already been used for this cart');
    });

    it('should not show master coupon if already used for cart', () => {
      const coupon = db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      const cart: Cart = {
        cart_id: 'cart_exclusive',
        items: [{ product_id: 1, quantity: 1, price: 100 }],
      };

      // Before applying
      const applicableBefore = couponService.getApplicableCoupons(cart);
      expect(applicableBefore).toHaveLength(1);

      // Apply the coupon
      couponService.applyCoupon(coupon.id, cart);

      // After applying - should not appear anymore
      const applicableAfter = couponService.getApplicableCoupons(cart);
      expect(applicableAfter).toHaveLength(0);
    });

    it('should work with empty details object', () => {
      const coupon = db.createCoupon({
        code: generateCouponCode(),
        type: 'master',
        details: {}
      });

      expect(coupon.type).toBe('master');
      expect(coupon.details).toEqual({});
    });
  });

  describe('Coupon codes and tags', () => {
    it('should create coupon with unique code', () => {
      const coupon = db.createCoupon({
        code: 'DIWALI100',
        type: 'cart-wise',
        details: { threshold: 100, discount: 20, discount_type: 'percentage' }
      });

      expect(coupon.code).toBe('DIWALI100');
    });

    it('should enforce unique codes (case-insensitive)', () => {
      db.createCoupon({
        code: 'NEWYEAR2025',
        type: 'cart-wise',
        details: { threshold: 100, discount: 10, discount_type: 'percentage' }
      });

      expect(() => {
        db.createCoupon({
          code: 'newyear2025', // lowercase should conflict
          type: 'product-wise',
          details: { product_id: 1, discount: 5, discount_type: 'fixed' }
        });
      }).toThrow("Coupon code 'newyear2025' already exists");
    });

    it('should store codes in uppercase', () => {
      const coupon = db.createCoupon({
        code: 'summer50',
        type: 'cart-wise',
        details: { threshold: 200, discount: 50, discount_type: 'fixed' }
      });

      expect(coupon.code).toBe('SUMMER50');
    });

    it('should retrieve coupon by code', () => {
      const created = db.createCoupon({
        code: 'WINTER25',
        type: 'cart-wise',
        details: { threshold: 150, discount: 25, discount_type: 'percentage' }
      });

      const retrieved = db.getCouponByCode('WINTER25');
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should retrieve coupon by code case-insensitively', () => {
      db.createCoupon({
        code: 'HOLIDAY30',
        type: 'cart-wise',
        details: { threshold: 100, discount: 30, discount_type: 'percentage' }
      });

      const retrieved = db.getCouponByCode('holiday30');
      expect(retrieved).toBeDefined();
      expect(retrieved?.code).toBe('HOLIDAY30');
    });

    it('should return undefined for non-existent code', () => {
      const retrieved = db.getCouponByCode('NONEXISTENT');
      expect(retrieved).toBeUndefined();
    });

    it('should create coupon with tags', () => {
      const coupon = db.createCoupon({
        code: 'FESTIVAL10',
        type: 'cart-wise',
        details: { threshold: 100, discount: 10, discount_type: 'percentage' },
        tags: ['seasonal', 'festival', 'limited-time']
      });

      expect(coupon.tags).toEqual(['seasonal', 'festival', 'limited-time']);
    });

    it('should filter coupons by single tag', () => {
      db.createCoupon({
        code: 'DIWALI50',
        type: 'cart-wise',
        details: { threshold: 100, discount: 50, discount_type: 'fixed' },
        tags: ['seasonal', 'diwali']
      });

      db.createCoupon({
        code: 'HOLI20',
        type: 'cart-wise',
        details: { threshold: 200, discount: 20, discount_type: 'percentage' },
        tags: ['seasonal', 'holi']
      });

      db.createCoupon({
        code: 'EVERYDAY5',
        type: 'cart-wise',
        details: { threshold: 50, discount: 5, discount_type: 'percentage' },
        tags: ['regular']
      });

      const seasonalCoupons = db.getCouponsByTags(['seasonal']);
      expect(seasonalCoupons.length).toBe(2);
      expect(seasonalCoupons.some(c => c.code === 'DIWALI50')).toBe(true);
      expect(seasonalCoupons.some(c => c.code === 'HOLI20')).toBe(true);
    });

    it('should filter coupons by multiple tags (OR logic)', () => {
      db.createCoupon({
        code: 'TAG1',
        type: 'cart-wise',
        details: { threshold: 100, discount: 10, discount_type: 'percentage' },
        tags: ['winter', 'clearance']
      });

      db.createCoupon({
        code: 'TAG2',
        type: 'cart-wise',
        details: { threshold: 100, discount: 15, discount_type: 'percentage' },
        tags: ['summer', 'clearance']
      });

      db.createCoupon({
        code: 'TAG3',
        type: 'cart-wise',
        details: { threshold: 100, discount: 20, discount_type: 'percentage' },
        tags: ['exclusive']
      });

      const clearanceCoupons = db.getCouponsByTags(['clearance', 'exclusive']);
      expect(clearanceCoupons.length).toBe(3); // All three match at least one tag
    });

    it('should match tags case-insensitively', () => {
      db.createCoupon({
        code: 'CASEMATCH',
        type: 'cart-wise',
        details: { threshold: 100, discount: 10, discount_type: 'percentage' },
        tags: ['Premium', 'VIP']
      });

      const results = db.getCouponsByTags(['premium', 'vip']);
      expect(results.length).toBe(1);
      expect(results[0].code).toBe('CASEMATCH');
    });

    it('should return all coupons when no tags provided', () => {
      const count = db.getAllCoupons().length;
      const results = db.getCouponsByTags([]);
      expect(results.length).toBe(count);
    });

    it('should return empty array when filtering by non-existent tag', () => {
      const results = db.getCouponsByTags(['nonexistent-tag']);
      expect(results.length).toBe(0);
    });

    it('should not return coupons without tags when filtering', () => {
      db.createCoupon({
        code: 'NOTAGS',
        type: 'cart-wise',
        details: { threshold: 100, discount: 10, discount_type: 'percentage' }
        // No tags
      });

      const results = db.getCouponsByTags(['any-tag']);
      expect(results.some(c => c.code === 'NOTAGS')).toBe(false);
    });

    it('should update code index when coupon code is updated', () => {
      const coupon = db.createCoupon({
        code: 'OLDCODE',
        type: 'cart-wise',
        details: { threshold: 100, discount: 10, discount_type: 'percentage' }
      });

      db.updateCoupon(coupon.id, { code: 'NEWCODE' });

      expect(db.getCouponByCode('OLDCODE')).toBeUndefined();
      expect(db.getCouponByCode('NEWCODE')).toBeDefined();
      expect(db.getCouponByCode('NEWCODE')?.id).toBe(coupon.id);
    });

    it('should delete code index when coupon is deleted', () => {
      const coupon = db.createCoupon({
        code: 'TODELETE',
        type: 'cart-wise',
        details: { threshold: 100, discount: 10, discount_type: 'percentage' }
      });

      db.deleteCoupon(coupon.id);

      expect(db.getCouponByCode('TODELETE')).toBeUndefined();
    });
  });
});
