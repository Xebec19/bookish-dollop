import { Coupon } from '../types';

class Database {
  private coupons: Map<number, Coupon> = new Map();
  private nextId: number = 1;

  createCoupon(coupon: Omit<Coupon, 'id' | 'created_at' | 'updated_at'>): Coupon {
    const now = new Date().toISOString();
    const newCoupon: Coupon = {
      id: this.nextId++,
      ...coupon,
      created_at: now,
      updated_at: now,
    };
    this.coupons.set(newCoupon.id, newCoupon);
    return newCoupon;
  }

  getCoupon(id: number): Coupon | undefined {
    return this.coupons.get(id);
  }

  getAllCoupons(): Coupon[] {
    return Array.from(this.coupons.values());
  }

  updateCoupon(id: number, updates: Partial<Omit<Coupon, 'id' | 'created_at'>>): Coupon | undefined {
    const coupon = this.coupons.get(id);
    if (!coupon) return undefined;

    const updatedCoupon: Coupon = {
      ...coupon,
      ...updates,
      id: coupon.id,
      created_at: coupon.created_at,
      updated_at: new Date().toISOString(),
    };
    this.coupons.set(id, updatedCoupon);
    return updatedCoupon;
  }

  deleteCoupon(id: number): boolean {
    return this.coupons.delete(id);
  }

  // Helper method to check if coupon is expired
  isCouponExpired(coupon: Coupon): boolean {
    if (!coupon.expiration_date) return false;
    return new Date(coupon.expiration_date) < new Date();
  }
}

export const db = new Database();
