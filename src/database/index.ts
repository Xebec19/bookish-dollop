import { Coupon } from '../types';

class Database {
  private coupons: Map<number, Coupon> = new Map();
  private couponsByCode: Map<string, Coupon> = new Map(); // Index for quick lookup by code
  private nextId: number = 1;
  // Track master coupon usage: Map<couponId, Set<cartId>>
  private masterCouponUsage: Map<number, Set<string>> = new Map();

  createCoupon(coupon: Omit<Coupon, 'id' | 'created_at' | 'updated_at'>): Coupon {
    // Check if code already exists
    if (this.couponsByCode.has(coupon.code.toUpperCase())) {
      throw new Error(`Coupon code '${coupon.code}' already exists`);
    }

    const now = new Date().toISOString();
    const newCoupon: Coupon = {
      id: this.nextId++,
      ...coupon,
      code: coupon.code.toUpperCase(), // Store in uppercase for consistency
      created_at: now,
      updated_at: now,
    };
    this.coupons.set(newCoupon.id, newCoupon);
    this.couponsByCode.set(newCoupon.code, newCoupon);
    return newCoupon;
  }

  getCoupon(id: number): Coupon | undefined {
    return this.coupons.get(id);
  }

  getCouponByCode(code: string): Coupon | undefined {
    return this.couponsByCode.get(code.toUpperCase());
  }

  getAllCoupons(): Coupon[] {
    return Array.from(this.coupons.values());
  }

  getCouponsByTags(tags: string[]): Coupon[] {
    if (!tags || tags.length === 0) {
      return this.getAllCoupons();
    }

    const normalizedTags = tags.map(t => t.toLowerCase());
    return Array.from(this.coupons.values()).filter(coupon => {
      if (!coupon.tags || coupon.tags.length === 0) return false;
      const couponTags = coupon.tags.map(t => t.toLowerCase());
      return normalizedTags.some(tag => couponTags.includes(tag));
    });
  }

  updateCoupon(id: number, updates: Partial<Omit<Coupon, 'id' | 'created_at'>>): Coupon | undefined {
    const coupon = this.coupons.get(id);
    if (!coupon) return undefined;

    // If code is being updated, check for uniqueness
    if (updates.code && updates.code.toUpperCase() !== coupon.code) {
      if (this.couponsByCode.has(updates.code.toUpperCase())) {
        throw new Error(`Coupon code '${updates.code}' already exists`);
      }
      // Remove old code from index
      this.couponsByCode.delete(coupon.code);
    }

    const updatedCoupon: Coupon = {
      ...coupon,
      ...updates,
      code: updates.code ? updates.code.toUpperCase() : coupon.code,
      id: coupon.id,
      created_at: coupon.created_at,
      updated_at: new Date().toISOString(),
    };

    this.coupons.set(id, updatedCoupon);
    this.couponsByCode.set(updatedCoupon.code, updatedCoupon);
    return updatedCoupon;
  }

  deleteCoupon(id: number): boolean {
    const coupon = this.coupons.get(id);
    if (!coupon) return false;

    this.couponsByCode.delete(coupon.code);
    return this.coupons.delete(id);
  }

  // Helper method to check if coupon is expired
  isCouponExpired(coupon: Coupon): boolean {
    if (!coupon.expiration_date) return false;
    return new Date(coupon.expiration_date) < new Date();
  }

  // Check if master coupon has been used for this cart
  hasMasterCouponBeenUsed(couponId: number, cartId: string): boolean {
    const usedCarts = this.masterCouponUsage.get(couponId);
    return usedCarts ? usedCarts.has(cartId) : false;
  }

  // Mark master coupon as used for this cart
  markMasterCouponAsUsed(couponId: number, cartId: string): void {
    if (!this.masterCouponUsage.has(couponId)) {
      this.masterCouponUsage.set(couponId, new Set());
    }
    this.masterCouponUsage.get(couponId)!.add(cartId);
  }

  // Reset master coupon usage for a specific cart (optional utility)
  resetMasterCouponUsageForCart(cartId: string): void {
    this.masterCouponUsage.forEach((carts) => {
      carts.delete(cartId);
    });
  }
}

export const db = new Database();
