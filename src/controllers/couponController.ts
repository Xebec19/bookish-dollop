import { Request, Response } from "express";
import { db } from "../database";
import { couponService } from "../services/couponService";
import {
  CreateCouponRequestSchema,
  UpdateCouponRequestSchema,
  ApplicableCouponsRequestSchema,
  ApplyCouponRequestSchema,
} from "../validation/schemas";
import { ZodError } from "zod";

export class CouponController {
  /**
   * Helper method to handle Zod validation errors
   */
  private handleZodError(error: ZodError, res: Response): void {
    const formattedErrors = error.issues.map((err: any) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    res.status(400).json({
      error: "Validation failed",
      details: formattedErrors,
    });
  }

  /**
   * POST /coupons - Create a new coupon
   */
  createCoupon(req: Request, res: Response): void {
    try {
      // Validate request body with Zod
      const validatedData = CreateCouponRequestSchema.parse(req.body);

      const coupon = db.createCoupon({
        code: validatedData.code,
        type: validatedData.type,
        details: validatedData.details,
        tags: validatedData.tags,
        expiration_date: validatedData.expiration_date,
      });

      res.status(201).json(coupon);
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleZodError(error, res);
        return;
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
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
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /coupons/:id - Get a specific coupon
   */
  getCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid coupon ID" });
        return;
      }

      const coupon = db.getCoupon(id);
      if (!coupon) {
        res.status(404).json({ error: "Coupon not found" });
        return;
      }

      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /coupons/code/:code - Get a specific coupon by code
   */
  getCouponByCode(req: Request, res: Response): void {
    try {
      const code = req.params.code;
      if (!code) {
        res.status(400).json({ error: "Coupon code is required" });
        return;
      }

      const coupon = db.getCouponByCode(code);
      if (!coupon) {
        res.status(404).json({ error: "Coupon not found" });
        return;
      }

      res.json(coupon);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /coupons/tags?tags=tag1,tag2 - Get coupons by tags
   */
  getCouponsByTags(req: Request, res: Response): void {
    try {
      const tagsParam = req.query.tags as string;
      const tags = tagsParam ? tagsParam.split(',').map(t => t.trim()) : [];

      const coupons = db.getCouponsByTags(tags);
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * PUT /coupons/:id - Update a coupon
   */
  updateCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid coupon ID" });
        return;
      }

      // Check if coupon exists
      const existingCoupon = db.getCoupon(id);
      if (!existingCoupon) {
        res.status(404).json({ error: "Coupon not found" });
        return;
      }

      // Validate request body with Zod
      const validatedData = UpdateCouponRequestSchema.parse(req.body);

      const updatedCoupon = db.updateCoupon(id, {
        code: validatedData.code,
        type: validatedData.type,
        details: validatedData.details,
        tags: validatedData.tags,
        expiration_date: validatedData.expiration_date,
      });

      res.json(updatedCoupon);
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleZodError(error, res);
        return;
      }
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * DELETE /coupons/:id - Delete a coupon
   */
  deleteCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid coupon ID" });
        return;
      }

      const deleted = db.deleteCoupon(id);
      if (!deleted) {
        res.status(404).json({ error: "Coupon not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /applicable-coupons - Get all applicable coupons for a cart
   */
  getApplicableCoupons(req: Request, res: Response): void {
    try {
      // Validate request body with Zod
      const validatedData = ApplicableCouponsRequestSchema.parse(req.body);

      const applicableCoupons = couponService.getApplicableCoupons(
        validatedData.cart
      );
      res.json({ applicable_coupons: applicableCoupons });
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleZodError(error, res);
        return;
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /apply-coupon/:id - Apply a specific coupon to cart
   */
  applyCoupon(req: Request, res: Response): void {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: "Invalid coupon ID" });
        return;
      }

      // Validate request body with Zod
      const validatedData = ApplyCouponRequestSchema.parse(req.body);

      const updatedCart = couponService.applyCoupon(id, validatedData.cart);
      res.json({ updated_cart: updatedCart });
    } catch (error) {
      if (error instanceof ZodError) {
        this.handleZodError(error, res);
        return;
      }
      if (error instanceof Error) {
        if (error.message === "Coupon not found") {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error.message === "Coupon has expired") {
          res.status(400).json({ error: error.message });
          return;
        }
        if (error.message === "Master coupon has already been used for this cart") {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export const couponController = new CouponController();
