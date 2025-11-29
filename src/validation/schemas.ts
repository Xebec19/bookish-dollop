import { z } from 'zod';

// Base schemas
export const DiscountTypeSchema = z.enum(['percentage', 'fixed']);

export const CartWiseDetailsSchema = z.object({
  threshold: z.number().positive('Threshold must be positive'),
  discount: z.number().nonnegative('Discount must be non-negative'),
  discount_type: DiscountTypeSchema,
}).refine(
  (data) => {
    if (data.discount_type === 'percentage') {
      return data.discount >= 0 && data.discount <= 100;
    }
    return true;
  },
  {
    message: 'Percentage discount must be between 0 and 100',
    path: ['discount'],
  }
);

export const ProductWiseDetailsSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive integer'),
  discount: z.number().nonnegative('Discount must be non-negative'),
  discount_type: DiscountTypeSchema,
}).refine(
  (data) => {
    if (data.discount_type === 'percentage') {
      return data.discount >= 0 && data.discount <= 100;
    }
    return true;
  },
  {
    message: 'Percentage discount must be between 0 and 100',
    path: ['discount'],
  }
);

export const BxGyProductSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const BxGyDetailsSchema = z.object({
  buy_products: z.array(BxGyProductSchema).min(1, 'buy_products must not be empty'),
  get_products: z.array(BxGyProductSchema).min(1, 'get_products must not be empty'),
  repition_limit: z.number().int().positive('Repetition limit must be a positive integer'),
});

export const MasterCouponDetailsSchema = z.object({}).passthrough();

// Coupon type enum
export const CouponTypeSchema = z.enum(['cart-wise', 'product-wise', 'bxgy', 'master']);

// Create coupon request schema with discriminated union
export const CreateCouponRequestSchema = z.object({
  code: z.string()
    .min(3, 'Coupon code must be at least 3 characters')
    .max(50, 'Coupon code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Coupon code can only contain letters, numbers, hyphens, and underscores')
    .transform(val => val.toUpperCase()),
  type: CouponTypeSchema,
  details: z.any(),
  tags: z.array(z.string()).optional(),
  expiration_date: z.string().datetime().optional(),
}).superRefine((data, ctx) => {
  // Validate details based on type
  if (data.type === 'cart-wise') {
    const result = CartWiseDetailsSchema.safeParse(data.details);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ['details', ...issue.path],
        });
      });
    }
  } else if (data.type === 'product-wise') {
    const result = ProductWiseDetailsSchema.safeParse(data.details);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ['details', ...issue.path],
        });
      });
    }
  } else if (data.type === 'bxgy') {
    const result = BxGyDetailsSchema.safeParse(data.details);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ['details', ...issue.path],
        });
      });
    }
  } else if (data.type === 'master') {
    const result = MasterCouponDetailsSchema.safeParse(data.details);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        ctx.addIssue({
          ...issue,
          path: ['details', ...issue.path],
        });
      });
    }
  }
});

// Update coupon request schema
export const UpdateCouponRequestSchema = z.object({
  code: z.string()
    .min(3, 'Coupon code must be at least 3 characters')
    .max(50, 'Coupon code must be at most 50 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Coupon code can only contain letters, numbers, hyphens, and underscores')
    .transform(val => val.toUpperCase())
    .optional(),
  type: CouponTypeSchema.optional(),
  details: z.any().optional(),
  tags: z.array(z.string()).optional(),
  expiration_date: z.string().datetime().optional(),
});

// Cart item schema
export const CartItemSchema = z.object({
  product_id: z.number().int().positive('Product ID must be a positive integer'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  price: z.number().nonnegative('Price must be non-negative'),
});

// Cart schema
export const CartSchema = z.object({
  items: z.array(CartItemSchema),
  cart_id: z.string().optional(),
});

// Request bodies
export const ApplicableCouponsRequestSchema = z.object({
  cart: CartSchema,
});

export const ApplyCouponRequestSchema = z.object({
  cart: CartSchema,
});
