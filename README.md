# Coupons Management API for E-commerce Platform

A RESTful API to manage and apply different types of discount coupons (cart-wise, product-wise, and BxGy) for an e-commerce platform.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [API Endpoints](#api-endpoints)
- [Coupon Types](#coupon-types)
- [Use Cases](#use-cases)
- [Assumptions](#assumptions)
- [Limitations](#limitations)
- [Testing](#testing)

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: In-memory (Map-based storage)
- **Testing**: Jest

## Quick Start

```bash
# Install dependencies
npm install

# Run tests to verify everything works
npm test

# Start development server
npm run dev
```

The server runs on `http://localhost:3000` by default.

**Test the API:**
```bash
# In a new terminal, run the test script
./test-api.sh
```

Or see [API_EXAMPLES.md](./API_EXAMPLES.md) for detailed API usage examples.

## Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test
```

The server runs on `http://localhost:3000` by default.

## API Endpoints

### Coupon CRUD Operations

#### 1. Create Coupon
```
POST /api/coupons
Content-Type: application/json

Body: { "type": "cart-wise|product-wise|bxgy", "details": {...}, "expiration_date": "ISO date string (optional)" }
```

#### 2. Get All Coupons
```
GET /api/coupons
```

#### 3. Get Coupon by ID
```
GET /api/coupons/:id
```

#### 4. Update Coupon
```
PUT /api/coupons/:id
Content-Type: application/json

Body: { "type": "...", "details": {...}, "expiration_date": "..." }
```

#### 5. Delete Coupon
```
DELETE /api/coupons/:id
```

### Coupon Application

#### 6. Get Applicable Coupons
```
POST /api/applicable-coupons
Content-Type: application/json

Body: {
  "cart": {
    "items": [
      { "product_id": 1, "quantity": 2, "price": 50 }
    ]
  }
}

Response: {
  "applicable_coupons": [
    { "coupon_id": 1, "type": "cart-wise", "discount": 10 }
  ]
}
```

#### 7. Apply Specific Coupon
```
POST /api/apply-coupon/:id
Content-Type: application/json

Body: {
  "cart": {
    "items": [
      { "product_id": 1, "quantity": 2, "price": 50 }
    ]
  }
}

Response: {
  "updated_cart": {
    "items": [...],
    "total_price": 100,
    "total_discount": 10,
    "final_price": 90
  }
}
```

## Coupon Types

### 1. Cart-wise Coupons
Applies discount to entire cart if total exceeds threshold.

```json
{
  "type": "cart-wise",
  "details": {
    "threshold": 100,
    "discount": 10
  }
}
```

### 2. Product-wise Coupons
Applies discount to specific product(s).

```json
{
  "type": "product-wise",
  "details": {
    "product_id": 1,
    "discount": 20
  }
}
```

### 3. BxGy (Buy X Get Y) Coupons
Complex promotional offers with repetition limits.

```json
{
  "type": "bxgy",
  "details": {
    "buy_products": [
      { "product_id": 1, "quantity": 2 },
      { "product_id": 2, "quantity": 2 }
    ],
    "get_products": [
      { "product_id": 3, "quantity": 1 }
    ],
    "repition_limit": 2
  }
}
```

## Use Cases

### Implemented Cases

#### Cart-wise Coupons

1. ✅ **Basic threshold discount**: 10% off on carts over Rs. 100
   - Works correctly when cart total > threshold
   - No discount when cart total ≤ threshold

2. ✅ **Proportional distribution**: Discount distributed proportionally across all items
   - Each item gets discount relative to its contribution to total

3. ✅ **Multiple quantity items**: Handles items with quantity > 1
   - Total price calculated as price × quantity

4. ✅ **Mixed cart**: Multiple different products in cart
   - All items considered for threshold calculation

#### Product-wise Coupons

5. ✅ **Single product discount**: 20% off on Product A
   - Applies only to specified product

6. ✅ **Multiple quantity**: Product with quantity > 1
   - Discount applied to total product value (price × quantity)

7. ✅ **Product not in cart**: Coupon not applicable
   - Returns discount = 0 in applicable coupons list

8. ✅ **Multiple products in cart**: Discount applies only to target product
   - Other products unaffected

#### BxGy Coupons

9. ✅ **Basic BxGy**: Buy 2 from [X, Y], Get 1 from [A, B] free
   - Pools buy products together (flexible matching)
   - Can buy any combination that meets total quantity

10. ✅ **Repetition limit enforcement**: Maximum applications = 2
    - Even if cart qualifies for more, limits to specified number

11. ✅ **Insufficient buy products**: Not enough items to qualify
    - Returns discount = 0

12. ✅ **Insufficient get products**: Fewer free items than qualified for
    - Applies discount only to available get products

13. ✅ **Price-based optimization**: Gives most expensive products free first
    - Maximizes customer discount value

14. ✅ **Partial repetitions**: 7 buy items with buy-2-get-1 rule
    - Applies 3 times, ignores remainder

#### General Features

15. ✅ **Expiration dates**: Coupons with expiration_date field
    - Expired coupons excluded from applicable list
    - Error thrown when applying expired coupon

16. ✅ **Multiple applicable coupons**: Returns all valid coupons sorted by discount
    - Best discount appears first

17. ✅ **Input validation**: Validates all request parameters
    - Product IDs, quantities, prices, coupon types, etc.

18. ✅ **Error handling**: Clear error messages for common scenarios
    - Coupon not found, invalid input, expired coupons

19. ✅ **Empty cart handling**: Returns no applicable coupons
    - Doesn't crash or error

20. ✅ **Zero-price items**: Handled correctly
    - No discount applied but doesn't break

### Unimplemented Cases (Edge Cases & Advanced Features)

#### Cart-wise Coupons

21. ❌ **Minimum item count**: Cart must have at least N items
    - Reason: Not in spec, would require schema change

22. ❌ **Specific categories**: Discount only if certain categories in cart
    - Reason: Requires product categorization system

23. ❌ **Maximum discount cap**: Discount cannot exceed fixed amount
    - Reason: Time constraint, adds complexity

24. ❌ **Tiered discounts**: Different discount rates for different thresholds
    - Reason: Would require array of threshold-discount pairs

#### Product-wise Coupons

25. ❌ **Quantity-based discounts**: Different discount for different quantities
    - Example: 10% for 1-5 items, 20% for 6+ items
    - Reason: Requires more complex discount structure

26. ❌ **Multiple product discounts**: One coupon for multiple products
    - Reason: Current schema supports single product_id

27. ❌ **Category-wise discounts**: Discount on all products in category
    - Reason: Requires product catalog with categories

28. ❌ **Maximum quantity limit**: Discount applies to first N items only
    - Example: 20% off, max 5 items
    - Reason: Time constraint

#### BxGy Coupons

29. ❌ **Exact matching**: Must buy exactly specified products (not pooled)
    - Example: Must buy 2 of product X specifically, not X or Y
    - Reason: Current implementation pools buy products for flexibility

30. ❌ **Different get products for different buy combinations**
    - Example: Buy X get A free, Buy Y get B free
    - Reason: Requires more complex mapping structure

31. ❌ **Tiered BxGy**: Different get quantities for different buy quantities
    - Example: Buy 2 get 1 free, Buy 5 get 3 free
    - Reason: Would need array of tiers

32. ❌ **Percentage discount on get products**: Instead of 100% free
    - Example: Buy 2, get 1 at 50% off
    - Reason: Spec shows only free items

33. ❌ **Minimum buy product price**: Must buy products over certain value
    - Reason: Adds validation complexity

34. ❌ **Get product priority selection**: User chooses which product to get free
    - Reason: Current implementation auto-selects by price

#### Coupon Stacking & Conflicts

35. ❌ **Coupon stacking**: Apply multiple coupons to same cart
    - Reason: Complex conflict resolution, out of scope

36. ❌ **Coupon priorities**: Some coupons override others
    - Reason: Requires priority field and conflict rules

37. ❌ **Exclusive coupons**: Cannot be combined with other coupons
    - Reason: Would need exclusivity flag

38. ❌ **Coupon groups**: Only one coupon from group can be applied
    - Reason: Requires grouping mechanism

#### Usage Limits & Restrictions

39. ❌ **Per-user usage limits**: Each user can use coupon N times
    - Reason: No user system implemented

40. ❌ **Total usage limits**: Coupon valid for first N uses globally
    - Reason: Would need usage counter

41. ❌ **Minimum cart items**: Must have at least N items
    - Reason: Not in spec

42. ❌ **Maximum cart value**: Coupon only valid up to certain cart value
    - Reason: Time constraint

43. ❌ **Day/time restrictions**: Valid only on certain days or times
    - Reason: Adds scheduling complexity

44. ❌ **First-time user only**: Coupon for new customers only
    - Reason: Requires user history

#### Payment & Processing

45. ❌ **Minimum payment method**: Valid only for certain payment types
    - Reason: Payment processing not in scope

46. ❌ **Shipping restrictions**: Free shipping coupons
    - Reason: Shipping not in scope

47. ❌ **Tax calculation**: Discounts before or after tax
    - Reason: Tax system not implemented

48. ❌ **Currency handling**: Multi-currency support
    - Reason: Single currency assumed

49. ❌ **Rounding strategies**: Different rounding methods
    - Reason: Standard round to 2 decimals used

#### Advanced BxGy Scenarios

50. ❌ **Cross-category BxGy**: Buy from category X, get from category Y
    - Reason: No product categorization

51. ❌ **Value-based BxGy**: Buy products worth X, get Y free
    - Reason: Different calculation model needed

52. ❌ **Mixed quantity BxGy**: Buy 2 of X and 1 of Y, get Z free
    - Reason: Current implementation pools quantities

53. ❌ **Progressive BxGy**: Each repetition gives different items
    - Reason: Complex state management

#### Data & Performance

54. ❌ **Coupon analytics**: Track usage, revenue impact
    - Reason: Analytics not in scope

55. ❌ **A/B testing**: Multiple variants of same coupon
    - Reason: Testing framework not needed

56. ❌ **Coupon recommendation**: Suggest best coupon for cart
    - Reason: Already sorted by discount value

57. ❌ **Performance optimization**: Caching, indexing for large catalogs
    - Reason: In-memory DB is already fast

58. ❌ **Concurrent cart modifications**: Handle race conditions
    - Reason: Stateless API, cart managed by client

#### Validation & Security

59. ❌ **Coupon codes**: String codes instead of numeric IDs
    - Reason: ID-based system simpler

60. ❌ **Coupon activation**: Inactive coupons that can be activated later
    - Reason: Would need status field

61. ❌ **Fraud detection**: Prevent coupon abuse
    - Reason: Security not in scope

62. ❌ **Negative price prevention**: Ensure final price never negative
    - Reason: Actually implemented! (max(0, finalPrice))

## Assumptions

1. **Currency**: All prices are in same currency (no conversion needed)

2. **Price precision**: Prices stored as numbers, rounded to 2 decimal places

3. **Cart ownership**: No user authentication, cart passed as request body

4. **Product catalog**: Product IDs exist and are valid (no validation against catalog)

5. **Quantity validity**: Quantities are positive integers

6. **Price validity**: Prices are non-negative

7. **Coupon stacking**: Only one coupon can be applied at a time (no stacking)

8. **BxGy pooling**: Buy products are pooled together (flexible matching)
   - Example: Buy 2 from [X, Y] means any 2 items from that set, not 2 of each

9. **Get product allocation**: Most expensive eligible products become free first

10. **Threshold comparison**: Cart-wise threshold uses `>` not `>=`
    - Cart must exceed threshold, not equal it

11. **Expiration timing**: Expiration checked at application time, not creation

12. **In-memory storage**: Data lost on server restart (not persistent)

13. **Discount rounding**: All discounts rounded to 2 decimal places

14. **Empty cart**: Valid input, returns no applicable coupons

15. **Concurrent requests**: No locking mechanism (acceptable for in-memory DB)

16. **Negative final price**: Prevented by max(0, finalPrice) logic

17. **Partial product availability**: If BxGy qualifies for 3 free items but only 2 in cart, give 2 free

18. **Coupon modification**: Can update active coupons (no version control)

19. **Delete active coupons**: Allowed, no cascade checks

20. **Time zones**: All timestamps in UTC (ISO 8601)

## Limitations

### Current Implementation Limitations

1. **In-memory database**
   - Data lost on restart
   - Not suitable for production
   - No persistence
   - **Improvement**: Use PostgreSQL/MongoDB for persistence

2. **No user system**
   - Cannot track per-user usage
   - Cannot implement user-specific coupons
   - **Improvement**: Add authentication and user context

3. **Single coupon application**
   - Cannot stack multiple coupons
   - Must choose one coupon even if multiple applicable
   - **Improvement**: Implement stacking rules and conflict resolution

4. **No product catalog**
   - Cannot validate product IDs
   - Cannot implement category-based coupons
   - Cannot validate product relationships
   - **Improvement**: Integrate with product catalog service

5. **No usage tracking**
   - Cannot limit total coupon uses
   - Cannot prevent abuse
   - Cannot generate analytics
   - **Improvement**: Add usage counter and audit log

6. **BxGy pooling**
   - Current implementation pools buy products
   - Cannot require specific product combinations
   - **Improvement**: Add exact matching mode option

7. **No coupon codes**
   - Uses numeric IDs instead of user-friendly codes
   - Less intuitive for users
   - **Improvement**: Add unique string code field with validation

8. **No activation/deactivation**
   - Coupons active immediately upon creation
   - Cannot schedule future activation
   - **Improvement**: Add status field and scheduling

9. **Simple discount model**
   - Only percentage discounts
   - No fixed amount discounts
   - No tiered/progressive discounts
   - **Improvement**: Support multiple discount types

10. **No transaction guarantees**
    - Race conditions possible with concurrent requests
    - **Improvement**: Add transaction support with real database

### Performance Limitations

11. **O(n) coupon checking**
    - Checks all coupons for applicability
    - Slow with many coupons
    - **Improvement**: Index by type, add filters

12. **BxGy complexity**
    - O(n*m) where n = cart items, m = buy/get products
    - Could be slow for large carts
    - **Improvement**: Optimize matching algorithm

13. **No caching**
    - Recalculates discounts every request
    - **Improvement**: Cache applicable coupons by cart signature

### Validation Limitations

14. **Basic validation only**
    - Doesn't validate business rules deeply
    - Example: Allows 150% discount
    - **Improvement**: Add comprehensive business rule validation

15. **No cross-field validation**
    - Doesn't check for logical conflicts
    - Example: Expiration date in past
    - **Improvement**: Add schema-level validation

### Testing Limitations

16. **Unit tests only**
    - No integration tests
    - No end-to-end tests
    - **Improvement**: Add full test suite

17. **Limited edge case coverage**
    - Many edge cases documented but not tested
    - **Improvement**: Expand test coverage

### Scalability Limitations

18. **Single instance**
    - Cannot scale horizontally
    - In-memory DB not shared
    - **Improvement**: Use external database and stateless design

19. **No rate limiting**
    - Vulnerable to abuse
    - **Improvement**: Add rate limiting middleware

20. **No monitoring**
    - No metrics or logging
    - Hard to debug production issues
    - **Improvement**: Add structured logging and metrics

## Testing

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The test suite covers:
- Cart-wise coupon calculations
- Product-wise coupon applications
- BxGy logic including repetition limits
- Edge cases (empty cart, zero prices, etc.)
- Error scenarios (expired coupons, invalid IDs)
- Multiple applicable coupons

## Example Usage

### Create a cart-wise coupon

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

### Get applicable coupons

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

### Apply a coupon

```bash
curl -X POST http://localhost:3000/api/apply-coupon/1 \
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

## Project Structure

```
src/
├── index.ts              # Express app entry point
├── types/                # TypeScript type definitions
│   └── index.ts
├── database/             # In-memory database
│   └── index.ts
├── services/             # Business logic
│   ├── couponService.ts
│   └── couponService.test.ts
├── controllers/          # Request handlers
│   └── couponController.ts
└── routes/               # API routes
    └── couponRoutes.ts
```

## License

ISC
