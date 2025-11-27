#!/bin/bash

echo "=== Testing Coupons Management API ==="

echo -e "\n1. Health Check"
curl -s http://localhost:3000/health | jq

echo -e "\n2. Create Cart-wise Coupon (10% off on carts over Rs. 100)"
curl -s -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{"type":"cart-wise","details":{"threshold":100,"discount":10}}' | jq

echo -e "\n3. Create Product-wise Coupon (20% off on Product 1)"
curl -s -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{"type":"product-wise","details":{"product_id":1,"discount":20}}' | jq

echo -e "\n4. Create BxGy Coupon (Buy 3 from [1,2], Get 1 from [3] free)"
curl -s -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{"type":"bxgy","details":{"buy_products":[{"product_id":1,"quantity":3},{"product_id":2,"quantity":3}],"get_products":[{"product_id":3,"quantity":1}],"repition_limit":2}}' | jq

echo -e "\n5. Get All Coupons"
curl -s http://localhost:3000/api/coupons | jq

echo -e "\n6. Get Specific Coupon (ID: 1)"
curl -s http://localhost:3000/api/coupons/1 | jq

echo -e "\n7. Get Applicable Coupons for Sample Cart"
echo "Cart: Product 1 (6x Rs.50), Product 2 (3x Rs.30), Product 3 (2x Rs.25)"
curl -s -X POST http://localhost:3000/api/applicable-coupons \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":6,"price":50},{"product_id":2,"quantity":3,"price":30},{"product_id":3,"quantity":2,"price":25}]}}' | jq

echo -e "\n8. Apply Cart-wise Coupon (ID: 1)"
curl -s -X POST http://localhost:3000/api/apply-coupon/1 \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":6,"price":50},{"product_id":2,"quantity":3,"price":30},{"product_id":3,"quantity":2,"price":25}]}}' | jq

echo -e "\n9. Apply Product-wise Coupon (ID: 2)"
curl -s -X POST http://localhost:3000/api/apply-coupon/2 \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":6,"price":50},{"product_id":2,"quantity":3,"price":30},{"product_id":3,"quantity":2,"price":25}]}}' | jq

echo -e "\n10. Apply BxGy Coupon (ID: 3)"
curl -s -X POST http://localhost:3000/api/apply-coupon/3 \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":6,"price":50},{"product_id":2,"quantity":3,"price":30},{"product_id":3,"quantity":2,"price":25}]}}' | jq

echo -e "\n=== All Tests Complete ==="
