#!/bin/bash

# API Testing Script - Comprehensive Testing
# This script tests all endpoints of the Coupons Management API

BASE_URL="http://localhost:3000/api"
RESULTS_FILE="test-results.json"
PASS_COUNT=0
FAIL_COUNT=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================="
echo "API TESTING - COUPONS MANAGEMENT SYSTEM"
echo "========================================="
echo ""

# Function to test API endpoint
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"

    echo -n "Testing: $test_name ... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$BASE_URL$endpoint")
    fi

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASS${NC} (Status: $status_code)"
        ((PASS_COUNT++))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
        echo -e "${RED}FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        ((FAIL_COUNT++))
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
    echo ""
}

echo "===================="
echo "1. COUPON CRUD TESTS"
echo "===================="
echo ""

# Test 1: Create cart-wise coupon with percentage discount
test_api \
    "Create cart-wise coupon (percentage)" \
    "POST" \
    "/coupons" \
    '{
        "code": "CART10",
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": 10,
            "discount_type": "percentage"
        },
        "tags": ["regular", "cart-discount"]
    }' \
    "201"

# Test 2: Create cart-wise coupon with fixed discount
test_api \
    "Create cart-wise coupon (fixed)" \
    "POST" \
    "/coupons" \
    '{
        "code": "SAVE50",
        "type": "cart-wise",
        "details": {
            "threshold": 200,
            "discount": 50,
            "discount_type": "fixed"
        },
        "tags": ["seasonal", "winter-sale"]
    }' \
    "201"

# Test 3: Create product-wise coupon
test_api \
    "Create product-wise coupon" \
    "POST" \
    "/coupons" \
    '{
        "code": "PRODUCT20",
        "type": "product-wise",
        "details": {
            "product_id": 1,
            "discount": 20,
            "discount_type": "percentage"
        },
        "tags": ["product-specific"]
    }' \
    "201"

# Test 4: Create BxGy coupon
test_api \
    "Create BxGy coupon" \
    "POST" \
    "/coupons" \
    '{
        "code": "BUY2GET1",
        "type": "bxgy",
        "details": {
            "buy_products": [
                {"product_id": 1, "quantity": 2}
            ],
            "get_products": [
                {"product_id": 2, "quantity": 1}
            ],
            "repition_limit": 3
        },
        "tags": ["bogo", "promotional"]
    }' \
    "201"

# Test 5: Create master coupon
test_api \
    "Create master coupon" \
    "POST" \
    "/coupons" \
    '{
        "code": "FREEBIE",
        "type": "master",
        "details": {},
        "tags": ["exclusive", "giveaway"]
    }' \
    "201"

# Test 6: Create coupon with expiration date
test_api \
    "Create coupon with expiration" \
    "POST" \
    "/coupons" \
    '{
        "code": "DIWALI100",
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": 100,
            "discount_type": "fixed"
        },
        "tags": ["seasonal", "diwali", "festival"],
        "expiration_date": "2025-12-31T23:59:59.000Z"
    }' \
    "201"

# Test 7: Get all coupons
test_api \
    "Get all coupons" \
    "GET" \
    "/coupons" \
    "" \
    "200"

# Test 8: Get specific coupon by ID
test_api \
    "Get coupon by ID (ID: 1)" \
    "GET" \
    "/coupons/1" \
    "" \
    "200"

# Test 9: Update coupon
test_api \
    "Update coupon" \
    "PUT" \
    "/coupons/1" \
    '{
        "code": "CART15",
        "details": {
            "threshold": 100,
            "discount": 15,
            "discount_type": "percentage"
        }
    }' \
    "200"

echo "================================"
echo "2. COUPON CODE VALIDATION TESTS"
echo "================================"
echo ""

# Test 10: Duplicate code (should fail)
test_api \
    "Create coupon with duplicate code" \
    "POST" \
    "/coupons" \
    '{
        "code": "CART15",
        "type": "cart-wise",
        "details": {
            "threshold": 50,
            "discount": 5,
            "discount_type": "percentage"
        }
    }' \
    "409"

# Test 11: Case-insensitive duplicate check
test_api \
    "Create coupon with duplicate code (lowercase)" \
    "POST" \
    "/coupons" \
    '{
        "code": "cart15",
        "type": "cart-wise",
        "details": {
            "threshold": 50,
            "discount": 5,
            "discount_type": "percentage"
        }
    }' \
    "409"

# Test 12: Invalid code format (too short)
test_api \
    "Create coupon with short code" \
    "POST" \
    "/coupons" \
    '{
        "code": "AB",
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": 10,
            "discount_type": "percentage"
        }
    }' \
    "400"

# Test 13: Invalid code format (special characters)
test_api \
    "Create coupon with invalid characters" \
    "POST" \
    "/coupons" \
    '{
        "code": "CODE@123",
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": 10,
            "discount_type": "percentage"
        }
    }' \
    "400"

# Test 14: Get coupon by code
test_api \
    "Get coupon by code (CART15)" \
    "GET" \
    "/coupons/code/CART15" \
    "" \
    "200"

# Test 15: Get coupon by code (case-insensitive)
test_api \
    "Get coupon by code (lowercase: cart15)" \
    "GET" \
    "/coupons/code/cart15" \
    "" \
    "200"

# Test 16: Get non-existent coupon by code
test_api \
    "Get non-existent coupon by code" \
    "GET" \
    "/coupons/code/NONEXISTENT" \
    "" \
    "404"

echo "====================="
echo "3. TAG FILTERING TESTS"
echo "====================="
echo ""

# Test 17: Filter by single tag
test_api \
    "Filter coupons by tag: seasonal" \
    "GET" \
    "/coupons/tags?tags=seasonal" \
    "" \
    "200"

# Test 18: Filter by multiple tags
test_api \
    "Filter coupons by multiple tags" \
    "GET" \
    "/coupons/tags?tags=seasonal,promotional" \
    "" \
    "200"

# Test 19: Filter with no tags (should return all)
test_api \
    "Filter with no tags" \
    "GET" \
    "/coupons/tags?tags=" \
    "" \
    "200"

# Test 20: Filter by non-existent tag
test_api \
    "Filter by non-existent tag" \
    "GET" \
    "/coupons/tags?tags=nonexistent" \
    "" \
    "200"

echo "=============================="
echo "4. COUPON APPLICATION TESTS"
echo "=============================="
echo ""

# Test 21: Get applicable coupons for cart
test_api \
    "Get applicable coupons" \
    "POST" \
    "/applicable-coupons" \
    '{
        "cart": {
            "items": [
                {"product_id": 1, "quantity": 2, "price": 100}
            ]
        }
    }' \
    "200"

# Test 22: Apply cart-wise percentage coupon
test_api \
    "Apply cart-wise percentage coupon" \
    "POST" \
    "/apply-coupon/1" \
    '{
        "cart": {
            "items": [
                {"product_id": 1, "quantity": 2, "price": 100}
            ]
        }
    }' \
    "200"

# Test 23: Apply cart-wise fixed discount coupon
test_api \
    "Apply cart-wise fixed discount coupon" \
    "POST" \
    "/apply-coupon/2" \
    '{
        "cart": {
            "items": [
                {"product_id": 1, "quantity": 3, "price": 100}
            ]
        }
    }' \
    "200"

# Test 24: Apply product-wise coupon
test_api \
    "Apply product-wise coupon" \
    "POST" \
    "/apply-coupon/3" \
    '{
        "cart": {
            "items": [
                {"product_id": 1, "quantity": 2, "price": 50}
            ]
        }
    }' \
    "200"

# Test 25: Apply BxGy coupon
test_api \
    "Apply BxGy coupon" \
    "POST" \
    "/apply-coupon/4" \
    '{
        "cart": {
            "items": [
                {"product_id": 1, "quantity": 2, "price": 50},
                {"product_id": 2, "quantity": 1, "price": 30}
            ]
        }
    }' \
    "200"

# Test 26: Apply master coupon
test_api \
    "Apply master coupon (first time)" \
    "POST" \
    "/apply-coupon/5" \
    '{
        "cart": {
            "cart_id": "test-cart-1",
            "items": [
                {"product_id": 1, "quantity": 2, "price": 100}
            ]
        }
    }' \
    "200"

# Test 27: Apply master coupon again (should fail)
test_api \
    "Apply master coupon (second time - should fail)" \
    "POST" \
    "/apply-coupon/5" \
    '{
        "cart": {
            "cart_id": "test-cart-1",
            "items": [
                {"product_id": 1, "quantity": 2, "price": 100}
            ]
        }
    }' \
    "400"

echo "=========================="
echo "5. EDGE CASES & ERROR TESTS"
echo "=========================="
echo ""

# Test 28: Missing required field (code)
test_api \
    "Create coupon without code" \
    "POST" \
    "/coupons" \
    '{
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": 10,
            "discount_type": "percentage"
        }
    }' \
    "400"

# Test 29: Invalid coupon type
test_api \
    "Create coupon with invalid type" \
    "POST" \
    "/coupons" \
    '{
        "code": "INVALID",
        "type": "invalid-type",
        "details": {}
    }' \
    "400"

# Test 30: Invalid discount_type
test_api \
    "Create coupon with invalid discount_type" \
    "POST" \
    "/coupons" \
    '{
        "code": "INVALIDDISC",
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": 10,
            "discount_type": "invalid"
        }
    }' \
    "400"

# Test 31: Percentage over 100
test_api \
    "Create coupon with percentage > 100" \
    "POST" \
    "/coupons" \
    '{
        "code": "OVER100",
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": 150,
            "discount_type": "percentage"
        }
    }' \
    "400"

# Test 32: Negative discount
test_api \
    "Create coupon with negative discount" \
    "POST" \
    "/coupons" \
    '{
        "code": "NEGATIVE",
        "type": "cart-wise",
        "details": {
            "threshold": 100,
            "discount": -10,
            "discount_type": "percentage"
        }
    }' \
    "400"

# Test 33: Apply non-existent coupon
test_api \
    "Apply non-existent coupon" \
    "POST" \
    "/apply-coupon/9999" \
    '{
        "cart": {
            "items": [
                {"product_id": 1, "quantity": 1, "price": 100}
            ]
        }
    }' \
    "404"

# Test 34: Get non-existent coupon
test_api \
    "Get non-existent coupon by ID" \
    "GET" \
    "/coupons/9999" \
    "" \
    "404"

# Test 35: Update non-existent coupon
test_api \
    "Update non-existent coupon" \
    "PUT" \
    "/coupons/9999" \
    '{
        "code": "NEWCODE"
    }' \
    "404"

# Test 36: Delete non-existent coupon
test_api \
    "Delete non-existent coupon" \
    "DELETE" \
    "/coupons/9999" \
    "" \
    "404"

# Test 37: Invalid ID format
test_api \
    "Get coupon with invalid ID" \
    "GET" \
    "/coupons/abc" \
    "" \
    "400"

# Test 38: Empty cart
test_api \
    "Get applicable coupons for empty cart" \
    "POST" \
    "/applicable-coupons" \
    '{
        "cart": {
            "items": []
        }
    }' \
    "200"

# Test 39: Cart below threshold
test_api \
    "Apply coupon when cart below threshold" \
    "POST" \
    "/apply-coupon/2" \
    '{
        "cart": {
            "items": [
                {"product_id": 1, "quantity": 1, "price": 50}
            ]
        }
    }' \
    "200"

# Test 40: Delete coupon
test_api \
    "Delete coupon" \
    "DELETE" \
    "/coupons/6" \
    "" \
    "204"

echo ""
echo "========================================="
echo "           TEST SUMMARY"
echo "========================================="
echo -e "${GREEN}PASSED: $PASS_COUNT${NC}"
echo -e "${RED}FAILED: $FAIL_COUNT${NC}"
echo -e "TOTAL:  $((PASS_COUNT + FAIL_COUNT))"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
