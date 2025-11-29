import { Router } from 'express';
import { couponController } from '../controllers/couponController';

const router = Router();

// CRUD operations
router.post('/coupons', (req, res) => couponController.createCoupon(req, res));
router.get('/coupons/tags', (req, res) => couponController.getCouponsByTags(req, res)); // Must be before /:id
router.get('/coupons/code/:code', (req, res) => couponController.getCouponByCode(req, res)); // Must be before /:id
router.get('/coupons', (req, res) => couponController.getAllCoupons(req, res));
router.get('/coupons/:id', (req, res) => couponController.getCoupon(req, res));
router.put('/coupons/:id', (req, res) => couponController.updateCoupon(req, res));
router.delete('/coupons/:id', (req, res) => couponController.deleteCoupon(req, res));

// Coupon application
router.post('/applicable-coupons', (req, res) => couponController.getApplicableCoupons(req, res));
router.post('/apply-coupon/:id', (req, res) => couponController.applyCoupon(req, res));

export default router;
