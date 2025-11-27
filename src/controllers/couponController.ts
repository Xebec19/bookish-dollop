import { Request, Response } from 'express';
import { db } from '../database';
import { couponService } from '../services/couponService';
import { CreateCouponRequest, Cart } from '../types';

export class CouponController {
  /**
   * POST /coupons - Create a new coupon
   */
  createCoupon(req: Request, res: Response): void {
    try {
      const { type, details, expiration_date } = req.body as CreateCouponRequest;

      // Validation
      if (!type || !details) {
        res.status(400).json({ error: 'Type and details are required' });
        return;
      }

      if (!['cart-wise', 'product-wise', 'bxgy'].includes(type)) {
        res.status(400).json({ error: 'Invalid coupon type' });
        return;
      }

      // Type-specific validation
      if (type === 'cart-wise') {
        const d = details as any;
        if (typeof d.threshold !== 'number' || typeof d.discount !== 'number') {
          res.status(400).json({ error: 'Cart-wise coupon requires threshold and discount' });
          return;
        }
        if (d.discount < 0 || d.discount > 100) {
          res.status(400).json({ error: 'Discount must be between 0 and 100' });
          return;
        }
      } else if (type === 'product-wise') {
        const d = details as any;
        if (typeof d.product_id !== 'number' || typeof d.discount !== 'number') {
          res.status(400).json({ error: 'Product-wise coupon requires product_id and discount' });
          return;
        }
        if (d.discount < 0 || d.discount > 100) {
          res.status(400).json({ error: 'Discount must be between 0 and 100' });
          return;
        }
      } else if (type === 'bxgy') {
        const d = details as any;
        if (!Array.isArray(d.buy_products) || !Array.isArray(d.get_products) || typeof d.repition_limit !== 'number') {
          res.status(400).json({ error: 'BxGy coupon requires buy_products, get_products, and repition_limit' });
          return;
        }
        if (d.buy_products.length === 0 || d.get_products.length === 0) {
          res.status(400).json({ error: 'buy_products and get_products must not be empty' });
          return;
        }
      }

      // Validate expiration date if provided
      if (expiration_date) {
        const expiryDate = new Date(expiration_date);
        if (isNaN(expiryDate.getTime())) {
          res.status(400).json({ error: 'Invalid expiration_date format' });
          return;
        }
      }

      const coupon = db.createCoupon({ type, details, expiration_date });
      res.status(201).json(coupon);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /coupons - Get all coupons
   */
  getAllCoupons(req: Request, res: Response): void {
    try {
      const coupons = db.getAllCoupons();
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /coupons/:id - Get a specific coupon
   */
  getCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid coupon ID' });
        return;
      }

      const coupon = db.getCoupon(id);
      if (!coupon) {
        res.status(404).json({ error: 'Coupon not found' });
        return;
      }

      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /coupons/:id - Update a coupon
   */
  updateCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid coupon ID' });
        return;
      }

      const { type, details, expiration_date } = req.body;

      // Check if coupon exists
      const existingCoupon = db.getCoupon(id);
      if (!existingCoupon) {
        res.status(404).json({ error: 'Coupon not found' });
        return;
      }

      // Validate type if provided
      if (type && !['cart-wise', 'product-wise', 'bxgy'].includes(type)) {
        res.status(400).json({ error: 'Invalid coupon type' });
        return;
      }

      // Validate expiration date if provided
      if (expiration_date) {
        const expiryDate = new Date(expiration_date);
        if (isNaN(expiryDate.getTime())) {
          res.status(400).json({ error: 'Invalid expiration_date format' });
          return;
        }
      }

      const updatedCoupon = db.updateCoupon(id, { type, details, expiration_date });
      res.json(updatedCoupon);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /coupons/:id - Delete a coupon
   */
  deleteCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid coupon ID' });
        return;
      }

      const deleted = db.deleteCoupon(id);
      if (!deleted) {
        res.status(404).json({ error: 'Coupon not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /applicable-coupons - Get all applicable coupons for a cart
   */
  getApplicableCoupons(req: Request, res: Response): void {
    try {
      const { cart } = req.body as { cart: Cart };

      if (!cart || !cart.items || !Array.isArray(cart.items)) {
        res.status(400).json({ error: 'Invalid cart data' });
        return;
      }

      // Validate cart items
      for (const item of cart.items) {
        if (typeof item.product_id !== 'number' || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
          res.status(400).json({ error: 'Each cart item must have product_id, quantity, and price' });
          return;
        }
        if (item.quantity <= 0 || item.price < 0) {
          res.status(400).json({ error: 'Quantity must be positive and price must be non-negative' });
          return;
        }
      }

      const applicableCoupons = couponService.getApplicableCoupons(cart);
      res.json({ applicable_coupons: applicableCoupons });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /apply-coupon/:id - Apply a specific coupon to cart
   */
  applyCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid coupon ID' });
        return;
      }

      const { cart } = req.body as { cart: Cart };

      if (!cart || !cart.items || !Array.isArray(cart.items)) {
        res.status(400).json({ error: 'Invalid cart data' });
        return;
      }

      // Validate cart items
      for (const item of cart.items) {
        if (typeof item.product_id !== 'number' || typeof item.quantity !== 'number' || typeof item.price !== 'number') {
          res.status(400).json({ error: 'Each cart item must have product_id, quantity, and price' });
          return;
        }
        if (item.quantity <= 0 || item.price < 0) {
          res.status(400).json({ error: 'Quantity must be positive and price must be non-negative' });
          return;
        }
      }

      const updatedCart = couponService.applyCoupon(id, cart);
      res.json({ updated_cart: updatedCart });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Coupon not found') {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message === 'Coupon has expired') {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const couponController = new CouponController();
