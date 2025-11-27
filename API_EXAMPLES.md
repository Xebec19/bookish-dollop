# API Examples

This file contains example requests and responses for the Coupons Management API.

## Prerequisites

Make sure the server is running:
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api`

## 1. Create Coupons

### Create a Cart-wise Coupon (10% off on carts over Rs. 100)

**Request:**
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cart-wise",
    "details": {
      "threshold": 100,
      "discount": 10
    }
  }'
```

**Response:**
```json
{
  "id": 1,
  "type": "cart-wise",
  "details": {
    "threshold": 100,
    "discount": 10
  },
  "created_at": "2025-11-27T17:00:00.000Z",
  "updated_at": "2025-11-27T17:00:00.000Z"
}
```

### Create a Product-wise Coupon (20% off on Product 1)

**Request:**
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "type": "product-wise",
    "details": {
      "product_id": 1,
      "discount": 20
    }
  }'
```

**Response:**
```json
{
  "id": 2,
  "type": "product-wise",
  "details": {
    "product_id": 1,
    "discount": 20
  },
  "created_at": "2025-11-27T17:00:00.000Z",
  "updated_at": "2025-11-27T17:00:00.000Z"
}
```

### Create a BxGy Coupon (Buy 3 from [1,2], Get 1 from [3] free)

**Request:**
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "type": "bxgy",
    "details": {
      "buy_products": [
        {"product_id": 1, "quantity": 3},
        {"product_id": 2, "quantity": 3}
      ],
      "get_products": [
        {"product_id": 3, "quantity": 1}
      ],
      "repition_limit": 2
    }
  }'
```

**Response:**
```json
{
  "id": 3,
  "type": "bxgy",
  "details": {
    "buy_products": [
      {"product_id": 1, "quantity": 3},
      {"product_id": 2, "quantity": 3}
    ],
    "get_products": [
      {"product_id": 3, "quantity": 1}
    ],
    "repition_limit": 2
  },
  "created_at": "2025-11-27T17:00:00.000Z",
  "updated_at": "2025-11-27T17:00:00.000Z"
}
```

### Create a Coupon with Expiration Date

**Request:**
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cart-wise",
    "details": {
      "threshold": 200,
      "discount": 15
    },
    "expiration_date": "2025-12-31T23:59:59.000Z"
  }'
```

## 2. Retrieve Coupons

### Get All Coupons

**Request:**
```bash
curl http://localhost:3000/api/coupons
```

**Response:**
```json
[
  {
    "id": 1,
    "type": "cart-wise",
    "details": { "threshold": 100, "discount": 10 },
    "created_at": "2025-11-27T17:00:00.000Z",
    "updated_at": "2025-11-27T17:00:00.000Z"
  },
  {
    "id": 2,
    "type": "product-wise",
    "details": { "product_id": 1, "discount": 20 },
    "created_at": "2025-11-27T17:00:00.000Z",
    "updated_at": "2025-11-27T17:00:00.000Z"
  }
]
```

### Get Specific Coupon

**Request:**
```bash
curl http://localhost:3000/api/coupons/1
```

**Response:**
```json
{
  "id": 1,
  "type": "cart-wise",
  "details": { "threshold": 100, "discount": 10 },
  "created_at": "2025-11-27T17:00:00.000Z",
  "updated_at": "2025-11-27T17:00:00.000Z"
}
```

## 3. Update Coupon

**Request:**
```bash
curl -X PUT http://localhost:3000/api/coupons/1 \
  -H "Content-Type: application/json" \
  -d '{
    "details": {
      "threshold": 150,
      "discount": 15
    }
  }'
```

**Response:**
```json
{
  "id": 1,
  "type": "cart-wise",
  "details": { "threshold": 150, "discount": 15 },
  "created_at": "2025-11-27T17:00:00.000Z",
  "updated_at": "2025-11-27T17:05:00.000Z"
}
```

## 4. Delete Coupon

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/coupons/1
```

**Response:**
```
204 No Content
```

## 5. Get Applicable Coupons

This endpoint shows all coupons that can be applied to a cart, sorted by discount amount (best discount first).

**Request:**
```bash
curl -X POST http://localhost:3000/api/applicable-coupons \
  -H "Content-Type: application/json" \
  -d '{
    "cart": {
      "items": [
        {"product_id": 1, "quantity": 6, "price": 50},
        {"product_id": 2, "quantity": 3, "price": 30},
        {"product_id": 3, "quantity": 2, "price": 25}
      ]
    }
  }'
```

**Cart Summary:**
- Product 1: 6 × Rs. 50 = Rs. 300
- Product 2: 3 × Rs. 30 = Rs. 90
- Product 3: 2 × Rs. 25 = Rs. 50
- **Total: Rs. 440**

**Response:**
```json
{
  "applicable_coupons": [
    {
      "coupon_id": 2,
      "type": "product-wise",
      "discount": 60
    },
    {
      "coupon_id": 1,
      "type": "cart-wise",
      "discount": 44
    },
    {
      "coupon_id": 3,
      "type": "bxgy",
      "discount": 25
    }
  ]
}
```

**Explanation:**
- **Coupon 2** (product-wise): 20% off Product 1 = 0.20 × 300 = Rs. 60
- **Coupon 1** (cart-wise): 10% off total (440 > 100) = 0.10 × 440 = Rs. 44
- **Coupon 3** (bxgy): Buy 6 from [1,2], get 1 from [3] free = 1 × 25 = Rs. 25

## 6. Apply Specific Coupon

This endpoint applies a specific coupon to the cart and returns the updated cart with item-level discounts.

### Apply Cart-wise Coupon

**Request:**
```bash
curl -X POST http://localhost:3000/api/apply-coupon/1 \
  -H "Content-Type: application/json" \
  -d '{
    "cart": {
      "items": [
        {"product_id": 1, "quantity": 2, "price": 100},
        {"product_id": 2, "quantity": 1, "price": 100}
      ]
    }
  }'
```

**Response:**
```json
{
  "updated_cart": {
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "price": 100,
        "total_discount": 20
      },
      {
        "product_id": 2,
        "quantity": 1,
        "price": 100,
        "total_discount": 10
      }
    ],
    "total_price": 300,
    "total_discount": 30,
    "final_price": 270
  }
}
```

### Apply Product-wise Coupon

**Request:**
```bash
curl -X POST http://localhost:3000/api/apply-coupon/2 \
  -H "Content-Type: application/json" \
  -d '{
    "cart": {
      "items": [
        {"product_id": 1, "quantity": 2, "price": 100},
        {"product_id": 2, "quantity": 1, "price": 100}
      ]
    }
  }'
```

**Response:**
```json
{
  "updated_cart": {
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "price": 100,
        "total_discount": 40
      },
      {
        "product_id": 2,
        "quantity": 1,
        "price": 100,
        "total_discount": 0
      }
    ],
    "total_price": 300,
    "total_discount": 40,
    "final_price": 260
  }
}
```

### Apply BxGy Coupon

**Request:**
```bash
curl -X POST http://localhost:3000/api/apply-coupon/3 \
  -H "Content-Type: application/json" \
  -d '{
    "cart": {
      "items": [
        {"product_id": 1, "quantity": 6, "price": 50},
        {"product_id": 2, "quantity": 3, "price": 30},
        {"product_id": 3, "quantity": 2, "price": 25}
      ]
    }
  }'
```

**Response:**
```json
{
  "updated_cart": {
    "items": [
      {
        "product_id": 1,
        "quantity": 6,
        "price": 50,
        "total_discount": 0
      },
      {
        "product_id": 2,
        "quantity": 3,
        "price": 30,
        "total_discount": 0
      },
      {
        "product_id": 3,
        "quantity": 2,
        "price": 25,
        "total_discount": 25
      }
    ],
    "total_price": 440,
    "total_discount": 25,
    "final_price": 415
  }
}
```

**Explanation:**
- Buy products in cart: 6 of product 1 + 3 of product 2 = 9 total
- Buy requirement: 3 + 3 = 6 per application
- Can apply: 9 / 6 = 1 time (limited to 1, even though repition_limit is 2)
- Get: 1 product from [3] free = 1 × Rs. 25 = Rs. 25 discount

## Error Examples

### Coupon Not Found

**Request:**
```bash
curl -X POST http://localhost:3000/api/apply-coupon/999 \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":1,"price":100}]}}'
```

**Response:**
```json
{
  "error": "Coupon not found"
}
```

### Invalid Coupon Type

**Request:**
```bash
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "type": "invalid-type",
    "details": {}
  }'
```

**Response:**
```json
{
  "error": "Invalid coupon type"
}
```

### Invalid Cart Data

**Request:**
```bash
curl -X POST http://localhost:3000/api/applicable-coupons \
  -H "Content-Type: application/json" \
  -d '{
    "cart": {
      "items": [
        {"product_id": 1, "quantity": -5, "price": 100}
      ]
    }
  }'
```

**Response:**
```json
{
  "error": "Quantity must be positive and price must be non-negative"
}
```

### Expired Coupon

**Request:**
```bash
# First create expired coupon
curl -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{
    "type": "cart-wise",
    "details": {"threshold": 100, "discount": 10},
    "expiration_date": "2020-01-01T00:00:00.000Z"
  }'

# Try to apply it (assuming it got ID 5)
curl -X POST http://localhost:3000/api/apply-coupon/5 \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":2,"price":100}]}}'
```

**Response:**
```json
{
  "error": "Coupon has expired"
}
```

## Testing All Endpoints

You can run this bash script to test all endpoints:

```bash
#!/bin/bash

echo "=== Testing Coupons API ==="

echo -e "\n1. Health Check"
curl -s http://localhost:3000/health | jq

echo -e "\n2. Create Cart-wise Coupon"
curl -s -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{"type":"cart-wise","details":{"threshold":100,"discount":10}}' | jq

echo -e "\n3. Create Product-wise Coupon"
curl -s -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{"type":"product-wise","details":{"product_id":1,"discount":20}}' | jq

echo -e "\n4. Create BxGy Coupon"
curl -s -X POST http://localhost:3000/api/coupons \
  -H "Content-Type: application/json" \
  -d '{"type":"bxgy","details":{"buy_products":[{"product_id":1,"quantity":3},{"product_id":2,"quantity":3}],"get_products":[{"product_id":3,"quantity":1}],"repition_limit":2}}' | jq

echo -e "\n5. Get All Coupons"
curl -s http://localhost:3000/api/coupons | jq

echo -e "\n6. Get Applicable Coupons"
curl -s -X POST http://localhost:3000/api/applicable-coupons \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":6,"price":50},{"product_id":2,"quantity":3,"price":30},{"product_id":3,"quantity":2,"price":25}]}}' | jq

echo -e "\n7. Apply BxGy Coupon"
curl -s -X POST http://localhost:3000/api/apply-coupon/3 \
  -H "Content-Type: application/json" \
  -d '{"cart":{"items":[{"product_id":1,"quantity":6,"price":50},{"product_id":2,"quantity":3,"price":30},{"product_id":3,"quantity":2,"price":25}]}}' | jq

echo -e "\n=== Testing Complete ==="
```

Save this as `test-api.sh` and run with:
```bash
chmod +x test-api.sh
./test-api.sh
```
