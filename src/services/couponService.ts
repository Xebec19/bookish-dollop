import {
  Cart,
  CartItem,
  Coupon,
  ApplicableCoupon,
  UpdatedCart,
  CartWiseDetails,
  ProductWiseDetails,
  BxGyDetails,
  MasterCouponDetails,
} from '../types';
import { db } from '../database';

export class CouponService {
  /**
   * Calculate the total price of items in cart
   */
  private calculateCartTotal(items: CartItem[]): number {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  /**
   * Check if cart-wise coupon is applicable and calculate discount
   */
  private calculateCartWiseDiscount(cart: Cart, details: CartWiseDetails): number {
    const total = this.calculateCartTotal(cart.items);
    if (total > details.threshold) {
      if (details.discount_type === 'percentage') {
        return (total * details.discount) / 100;
      } else {
        // Fixed discount - ensure it doesn't exceed cart total
        return Math.min(details.discount, total);
      }
    }
    return 0;
  }

  /**
   * Check if product-wise coupon is applicable and calculate discount
   */
  private calculateProductWiseDiscount(cart: Cart, details: ProductWiseDetails): number {
    const item = cart.items.find(i => i.product_id === details.product_id);
    if (!item) return 0;

    const productTotal = item.price * item.quantity;
    if (details.discount_type === 'percentage') {
      return (productTotal * details.discount) / 100;
    } else {
      // Fixed discount - ensure it doesn't exceed product total
      return Math.min(details.discount, productTotal);
    }
  }

  /**
   * Calculate BxGy discount - complex logic for Buy X Get Y deals
   *
   * Logic:
   * 1. Count how many "buy" products are in the cart
   * 2. Calculate how many times the deal can be applied (limited by repetition_limit)
   * 3. Determine which "get" products are free based on availability
   * 4. Calculate total discount as sum of free product prices
   */
  private calculateBxGyDiscount(cart: Cart, details: BxGyDetails): number {
    // Count buy products in cart
    let buyProductsCount = 0;
    let totalBuyQuantityRequired = 0;

    // Calculate total buy quantity required per application
    details.buy_products.forEach(bp => {
      totalBuyQuantityRequired += bp.quantity;
    });

    // Count how many buy products we have in cart
    const buyProductMap = new Map<number, number>();
    details.buy_products.forEach(bp => {
      const cartItem = cart.items.find(i => i.product_id === bp.product_id);
      if (cartItem) {
        buyProductMap.set(bp.product_id, cartItem.quantity);
      }
    });

    // Calculate how many complete sets of buy products we have
    // For flexible BxGy: we pool all buy products together
    let totalBuyProductsInCart = 0;
    buyProductMap.forEach(qty => {
      totalBuyProductsInCart += qty;
    });

    // How many times can we apply the deal based on buy products?
    const timesApplicableByBuy = Math.floor(totalBuyProductsInCart / totalBuyQuantityRequired);

    // Limit by repetition limit
    const timesApplicable = Math.min(timesApplicableByBuy, details.repition_limit);

    if (timesApplicable === 0) return 0;

    // Calculate how many get products we should get free
    let totalGetQuantity = 0;
    details.get_products.forEach(gp => {
      totalGetQuantity += gp.quantity;
    });

    const totalFreeProducts = timesApplicable * totalGetQuantity;

    // Collect all available get products from cart with their prices
    const availableGetProducts: { product_id: number; price: number; available: number }[] = [];
    details.get_products.forEach(gp => {
      const cartItem = cart.items.find(i => i.product_id === gp.product_id);
      if (cartItem) {
        availableGetProducts.push({
          product_id: gp.product_id,
          price: cartItem.price,
          available: cartItem.quantity,
        });
      }
    });

    if (availableGetProducts.length === 0) return 0;

    // Sort by price descending to maximize discount (give most expensive items free first)
    availableGetProducts.sort((a, b) => b.price - a.price);

    // Calculate discount by allocating free products
    let discount = 0;
    let remainingFreeProducts = totalFreeProducts;

    for (const product of availableGetProducts) {
      if (remainingFreeProducts === 0) break;

      const freeQty = Math.min(remainingFreeProducts, product.available);
      discount += freeQty * product.price;
      remainingFreeProducts -= freeQty;
    }

    return discount;
  }

  /**
   * Calculate master coupon discount - gives 100% discount on entire cart
   * Can only be applied once per cart
   */
  private calculateMasterCouponDiscount(cart: Cart, couponId: number): number {
    // Check if this master coupon has already been used for this cart
    const cartId = cart.cart_id || 'default';
    if (db.hasMasterCouponBeenUsed(couponId, cartId)) {
      return 0;
    }

    // Return 100% of cart total
    return this.calculateCartTotal(cart.items);
  }

  /**
   * Get all applicable coupons for a cart with their discount amounts
   */
  getApplicableCoupons(cart: Cart): ApplicableCoupon[] {
    const allCoupons = db.getAllCoupons();
    const applicableCoupons: ApplicableCoupon[] = [];

    for (const coupon of allCoupons) {
      // Skip expired coupons
      if (db.isCouponExpired(coupon)) continue;

      let discount = 0;

      switch (coupon.type) {
        case 'cart-wise':
          discount = this.calculateCartWiseDiscount(cart, coupon.details as CartWiseDetails);
          break;
        case 'product-wise':
          discount = this.calculateProductWiseDiscount(cart, coupon.details as ProductWiseDetails);
          break;
        case 'bxgy':
          discount = this.calculateBxGyDiscount(cart, coupon.details as BxGyDetails);
          break;
        case 'master':
          discount = this.calculateMasterCouponDiscount(cart, coupon.id);
          break;
      }

      // Only include if discount > 0
      if (discount > 0) {
        applicableCoupons.push({
          coupon_id: coupon.id,
          type: coupon.type,
          discount: Math.round(discount * 100) / 100, // Round to 2 decimal places
        });
      }
    }

    // Sort by discount amount descending (best discount first)
    applicableCoupons.sort((a, b) => b.discount - a.discount);

    return applicableCoupons;
  }

  /**
   * Apply a specific coupon to the cart and return updated cart with item-level discounts
   */
  applyCoupon(couponId: number, cart: Cart): UpdatedCart {
    const coupon = db.getCoupon(couponId);
    if (!coupon) {
      throw new Error('Coupon not found');
    }

    if (db.isCouponExpired(coupon)) {
      throw new Error('Coupon has expired');
    }

    // Initialize items with zero discount
    const updatedItems: CartItem[] = cart.items.map(item => ({
      ...item,
      total_discount: 0,
    }));

    const originalTotal = this.calculateCartTotal(cart.items);
    let totalDiscount = 0;

    switch (coupon.type) {
      case 'cart-wise': {
        const details = coupon.details as CartWiseDetails;
        if (originalTotal > details.threshold) {
          if (details.discount_type === 'percentage') {
            totalDiscount = (originalTotal * details.discount) / 100;
          } else {
            totalDiscount = Math.min(details.discount, originalTotal);
          }
          // Distribute discount proportionally across all items
          const discountRatio = totalDiscount / originalTotal;
          updatedItems.forEach(item => {
            const itemTotal = item.price * item.quantity;
            item.total_discount = Math.round(itemTotal * discountRatio * 100) / 100;
          });
        }
        break;
      }

      case 'product-wise': {
        const details = coupon.details as ProductWiseDetails;
        const itemIndex = updatedItems.findIndex(i => i.product_id === details.product_id);
        if (itemIndex !== -1) {
          const item = updatedItems[itemIndex];
          const itemTotal = item.price * item.quantity;
          let discount = 0;
          if (details.discount_type === 'percentage') {
            discount = (itemTotal * details.discount) / 100;
          } else {
            discount = Math.min(details.discount, itemTotal);
          }
          item.total_discount = Math.round(discount * 100) / 100;
          totalDiscount = item.total_discount;
        }
        break;
      }

      case 'bxgy': {
        const details = coupon.details as BxGyDetails;

        // Similar logic to calculateBxGyDiscount but we need to update item quantities
        let totalBuyQuantityRequired = 0;
        details.buy_products.forEach(bp => {
          totalBuyQuantityRequired += bp.quantity;
        });

        let totalBuyProductsInCart = 0;
        details.buy_products.forEach(bp => {
          const cartItem = cart.items.find(i => i.product_id === bp.product_id);
          if (cartItem) {
            totalBuyProductsInCart += cartItem.quantity;
          }
        });

        const timesApplicableByBuy = Math.floor(totalBuyProductsInCart / totalBuyQuantityRequired);
        const timesApplicable = Math.min(timesApplicableByBuy, details.repition_limit);

        if (timesApplicable > 0) {
          let totalGetQuantity = 0;
          details.get_products.forEach(gp => {
            totalGetQuantity += gp.quantity;
          });

          const totalFreeProducts = timesApplicable * totalGetQuantity;

          // Find get products in cart, sorted by price descending
          const getProductsInCart = updatedItems
            .filter(item => details.get_products.some(gp => gp.product_id === item.product_id))
            .sort((a, b) => b.price - a.price);

          // Allocate free products
          let remainingFreeProducts = totalFreeProducts;
          for (const item of getProductsInCart) {
            if (remainingFreeProducts === 0) break;

            const freeQty = Math.min(remainingFreeProducts, item.quantity);
            const discount = freeQty * item.price;
            item.total_discount = Math.round(discount * 100) / 100;
            totalDiscount += item.total_discount;
            remainingFreeProducts -= freeQty;
          }
        }
        break;
      }

      case 'master': {
        // Check if master coupon has already been used for this cart
        const cartId = cart.cart_id || 'default';
        if (db.hasMasterCouponBeenUsed(couponId, cartId)) {
          throw new Error('Master coupon has already been used for this cart');
        }

        // Apply 100% discount - distribute proportionally across all items
        totalDiscount = originalTotal;
        const discountRatio = 1.0; // 100% discount
        updatedItems.forEach(item => {
          const itemTotal = item.price * item.quantity;
          item.total_discount = Math.round(itemTotal * discountRatio * 100) / 100;
        });

        // Mark the coupon as used for this cart
        db.markMasterCouponAsUsed(couponId, cartId);
        break;
      }
    }

    totalDiscount = Math.round(totalDiscount * 100) / 100;
    const finalPrice = Math.round((originalTotal - totalDiscount) * 100) / 100;

    return {
      items: updatedItems,
      total_price: Math.round(originalTotal * 100) / 100,
      total_discount: totalDiscount,
      final_price: Math.max(0, finalPrice), // Ensure non-negative
    };
  }
}

export const couponService = new CouponService();
