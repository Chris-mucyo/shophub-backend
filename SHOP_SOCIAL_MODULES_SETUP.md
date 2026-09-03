# ShopHub Shop & Social Modules Setup Guide

Complete implementation of shop management with social media features for ShopHub B2B marketplace.

---

## Overview

The new modules provide:
- **ShopsModule**: Shop profiles with avatar, cover, bio, social links (Instagram-style)
- **ProductsModule**: Products as social posts with captions, tags, images
- **SocialModule**: Follow shops, like products, comment on products
- **NotificationsModule**: Real-time notifications for follows, likes, comments, orders
- **FeedModule**: Personalized feed, trending products, shop discovery

---

## 1. Database Migration

### Prisma Schema Changes

The schema now includes:
- **Shop** model: bio, avatarUrl, coverPhotoUrl, category, location, website, socialLinks, followersCount, productsCount
- **Product** model: caption, tags, likeCount, commentCount
- **Follow** model: followerId, shopId (unique compound index)
- **Like** model: userId, productId (unique compound index)
- **Comment** model: userId, productId, text
- **Notification** model: userId, type (FOLLOW/LIKE/COMMENT/ORDER/SYSTEM), message, read

### Run Migration

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name add_shop_social_features

# Or if using db push (development)
npx prisma db push --accept-data-loss
```

---

## 2. New Modules Structure

```
src/
├── shops/
│   ├── dto/
│   │   ├── create-shop.dto.ts
│   │   ├── update-shop.dto.ts
│   │   └── shop-response.dto.ts
│   ├── shops.controller.ts
│   ├── shops.service.ts
│   └── shops.module.ts
├── products/
│   ├── dto/
│   │   ├── create-product.dto.ts
│   │   ├── update-product.dto.ts
│   │   └── product-response.dto.ts
│   ├── products.controller.ts
│   ├── products.service.ts
│   └── products.module.ts
├── social/
│   ├── dto/
│   │   ├── create-comment.dto.ts
│   │   ├── update-comment.dto.ts
│   │   └── social-response.dto.ts
│   ├── social.controller.ts
│   ├── social.service.ts
│   └── social.module.ts
├── notifications/
│   ├── dto/
│   │   └── notification-response.dto.ts
│   ├── notifications.controller.ts
│   ├── notifications.service.ts
│   └── notifications.module.ts
└── feed/
    ├── dto/
    │   └── feed-response.dto.ts
    ├── feed.controller.ts
    ├── feed.service.ts
    └── feed.module.ts
```

---

## 3. API Endpoints

### Shop Endpoints

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/shops` | ✓ | WHOLESALER | Create shop (multipart: avatar, cover) |
| GET | `/shops` | - | - | List shops (paginated, filterable) |
| GET | `/shops/my-shop` | ✓ | WHOLESALER | Get current user's shop |
| GET | `/shops/:id` | - | - | Get shop by ID |
| PATCH | `/shops/:id` | ✓ | Owner | Update shop (multipart) |
| DELETE | `/shops/:id` | ✓ | Owner | Delete shop |

### Product Endpoints

| Method | Endpoint | Auth | Roles | Description |
|--------|----------|------|-------|-------------|
| POST | `/shops/:shopId/products` | ✓ | WHOLESALER | Add product (multipart: up to 5 images) |
| GET | `/shops/:shopId/products` | - | - | List shop products |
| GET | `/shops/:shopId/products/:id` | - | - | Get product detail |
| GET | `/shops/:shopId/products/:id/detail` | - | - | Get product with comments |
| PATCH | `/shops/:shopId/products/:id` | ✓ | Owner | Update product |
| DELETE | `/shops/:shopId/products/:id` | ✓ | Owner | Delete product |

### Social Endpoints

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/shops/:id/follow` | ✓ | 10/min | Follow shop |
| DELETE | `/shops/:id/follow` | ✓ | 10/min | Unfollow shop |
| GET | `/shops/:id/followers` | - | - | Get shop followers |
| GET | `/me/following` | ✓ | - | Get my followed shops |
| POST | `/products/:id/like` | ✓ | 20/min | Like/unlike product (toggle) |
| GET | `/products/:id/likes` | - | - | Get product likes |
| POST | `/products/:id/comments` | ✓ | 20/min | Add comment |
| GET | `/products/:id/comments` | - | - | Get comments (paginated) |
| PATCH | `/comments/:id` | ✓ | - | Update own comment |
| DELETE | `/comments/:id` | ✓ | - | Delete own comment |

### Feed Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/feed` | ✓ | Personalized feed (followed + popular) |
| GET | `/feed/trending` | - | Trending products (last 7 days) |
| GET | `/feed/discover` | ✓ | Suggested shops to follow |

### Notification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | ✓ | Get notifications (paginated) |
| GET | `/notifications/unread-count` | ✓ | Get unread count |
| PATCH | `/notifications/:id/read` | ✓ | Mark as read |
| POST | `/notifications/read-all` | ✓ | Mark all as read |

---

## 4. Example cURL Commands

### Create Shop (Wholesaler)
```bash
curl -X POST http://localhost:3000/shops \
  -H "Authorization: Bearer <wholesaler_token>" \
  -F 'name=Tech Wholesale Hub' \
  -F 'description=Best electronics at wholesale prices' \
  -F 'bio=Your trusted electronics partner since 2020' \
  -F 'category=Electronics' \
  -F 'location=Kigali, Rwanda' \
  -F 'website=https://techwholesale.rw' \
  -F 'socialLinks={"instagram":"@techwholesale","facebook":"techwholesale.rw"}' \
  -F 'avatar=@/path/to/avatar.jpg' \
  -F 'cover=@/path/to/cover.jpg'
```

### List Shops
```bash
# Basic list
curl http://localhost:3000/shops

# With filters
curl "http://localhost:3000/shops?page=1&limit=10&category=Electronics&location=Kigali&sortBy=followers"
```

### Get Shop Detail
```bash
curl http://localhost:3000/shops/<shop-id>
```

### Update Shop (Owner)
```bash
curl -X PATCH http://localhost:3000/shops/<shop-id> \
  -H "Authorization: Bearer <owner_token>" \
  -F 'bio=Updated bio with new info' \
  -F 'avatar=@/path/to/new-avatar.jpg'
```

### Add Product (Shop Owner)
```bash
curl -X POST http://localhost:3000/shops/<shop-id>/products \
  -H "Authorization: Bearer <wholesaler_token>" \
  -F 'name=Wireless Headphones Pro' \
  -F 'description=Premium noise-cancelling headphones' \
  -F 'caption=New arrival! 🎧 Best sound quality at wholesale price #electronics #audio' \
  -F 'tags=["electronics","audio","headphones","wholesale"]' \
  -F 'price=45.99' \
  -F 'stock=100' \
  -F 'category=Electronics' \
  -F 'images=@/path/to/img1.jpg' \
  -F 'images=@/path/to/img2.jpg' \
  -F 'images=@/path/to/img3.jpg'
```

### Get Shop Products
```bash
curl "http://localhost:3000/shops/<shop-id>/products?page=1&limit=20"
```

### Get Product Detail
```bash
curl http://localhost:3000/shops/<shop-id>/products/<product-id>
```

### Follow Shop
```bash
curl -X POST http://localhost:3000/shops/<shop-id>/follow \
  -H "Authorization: Bearer <user_token>"
```

### Unfollow Shop
```bash
curl -X DELETE http://localhost:3000/shops/<shop-id>/follow \
  -H "Authorization: Bearer <user_token>"
```

### Like/Unlike Product (Toggle)
```bash
curl -X POST http://localhost:3000/products/<product-id>/like \
  -H "Authorization: Bearer <user_token>"
```

### Add Comment
```bash
curl -X POST http://localhost:3000/products/<product-id>/comments \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Great product! Interested in bulk order for my store."}'
```

### Get Comments
```bash
curl "http://localhost:3000/products/<product-id>/comments?page=1&limit=20"
```

### Update Own Comment
```bash
curl -X PATCH http://localhost:3000/comments/<comment-id> \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Updated: Great product! Will order 50 units."}'
```

### Delete Own Comment
```bash
curl -X DELETE http://localhost:3000/comments/<comment-id> \
  -H "Authorization: Bearer <user_token>"
```

### Get Personalized Feed
```bash
curl -X GET http://localhost:3000/feed \
  -H "Authorization: Bearer <user_token>"
```

### Get Trending Products
```bash
curl "http://localhost:3000/feed/trending?page=1&limit=20&days=7"
```

### Discover Shops
```bash
curl -X GET http://localhost:3000/feed/discover \
  -H "Authorization: Bearer <user_token>"
```

### Get Notifications
```bash
curl -X GET "http://localhost:3000/notifications?page=1&limit=20" \
  -H "Authorization: Bearer <user_token>"

# Unread only
curl -X GET "http://localhost:3000/notifications?unreadOnly=true" \
  -H "Authorization: Bearer <user_token>"
```

### Get Unread Count
```bash
curl -X GET http://localhost:3000/notifications/unread-count \
  -H "Authorization: Bearer <user_token>"
```

### Mark Notification as Read
```bash
curl -X PATCH http://localhost:3000/notifications/<notification-id>/read \
  -H "Authorization: Bearer <user_token>"
```

### Mark All as Read
```bash
curl -X POST http://localhost:3000/notifications/read-all \
  -H "Authorization: Bearer <user_token>"
```

---

## 5. Key Business Rules

### Shop Creation
- Only users with `role: WHOLESALER` AND `wholesalerStatus: APPROVED` can create shops
- One shop per wholesaler (enforced by unique `ownerId`)
- Avatar and cover images optional, uploaded to Cloudinary

### Product Creation
- Only shop owner can add products
- Minimum 1 image, maximum 5 images per product
- Images uploaded to Cloudinary `products` folder
- Products support social features: caption, tags (hashtags)

### Social Interactions
- Any authenticated user (RETAILER/WHOLESALER/ADMIN) can follow, like, comment
- Users cannot follow their own shops
- Like is a toggle (POST = like if not liked, unlike if already liked)
- Comments can only be edited/deleted by author

### Counter Updates
- All counters (followersCount, productsCount, likeCount, commentCount) updated via Prisma transactions
- Atomic operations prevent race conditions

### Notifications
- Created automatically on: follow, like, comment
- Not sent to self (actorId === recipientId)
- Types: FOLLOW, LIKE, COMMENT, ORDER, SYSTEM
- Read status tracked

---

## 6. Rate Limiting

Configured via `@Throttle` decorator:
- **Shop create/update**: 5 req/min
- **Follow/Unfollow**: 10 req/min
- **Like/Comment**: 20 req/min
- **Product create/update**: 10 req/min

Global throttle: 100 req/min (from AppModule)

---

## 7. Swagger Documentation

All endpoints documented at `http://localhost:3000/api/docs` with:
- `@ApiTags` for grouping
- `@ApiBearerAuth` for protected routes
- `@ApiConsumes('multipart/form-data')` for file uploads
- `@ApiBody` with `format: 'binary'` for file fields
- `@ApiQuery` for pagination/filter params
- `@ApiParam` for path params
- `@ApiResponse` for success/error responses

---

## 8. Testing Checklist

### Shop Flow
- [ ] Wholesaler creates shop with avatar/cover
- [ ] Non-wholesaler cannot create shop (403)
- [ ] Unapproved wholesaler cannot create shop (403)
- [ ] Shop owner can update shop
- [ ] Non-owner cannot update shop (403)
- [ ] Shop deletion cascades products (soft delete via transaction)

### Product Flow
- [ ] Shop owner creates product with 1-5 images
- [ ] Product without images rejected (400)
- [ ] Product with >5 images rejected (400)
- [ ] Product appears in shop's product list
- [ ] Product detail shows like/comment counts
- [ ] Product detail shows `likedByUser` flag

### Social Flow
- [ ] User follows shop → followersCount increments
- [ ] User cannot follow own shop (400)
- [ ] Duplicate follow rejected (400)
- [ ] Unfollow decrements followersCount
- [ ] Like toggles correctly, likeCount updates
- [ ] Comments added, commentCount increments
- [ ] Only comment author can update/delete

### Feed Flow
- [ ] Feed shows followed shops' products first
- [ ] Feed supplements with popular products if few follows
- [ ] Trending shows most engaged (likes + 2×comments) in timeframe
- [ ] Discover excludes already-followed shops

### Notifications
- [ ] Follow creates FOLLOW notification for shop owner
- [ ] Like creates LIKE notification for shop owner
- [ ] Comment creates COMMENT notification for shop owner
- [ ] No notification sent to self
- [ ] Read status updates correctly
- [ ] Unread count accurate

---

## 9. Environment Variables

No new env vars required. Uses existing:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `FRONTEND_URL`

---

## 10. Common Issues

| Issue | Solution |
|-------|----------|
| Prisma generate fails (EPERM) | Close IDE/terminal, retry `npx prisma generate` |
| File upload fails | Check Cloudinary credentials; ensure multipart/form-data |
| 403 on shop create | Verify user has `role: WHOLESALER` and `wholesalerStatus: APPROVED` |
| Counters out of sync | Use Prisma transactions (already implemented) |
| Feed empty for new users | Falls back to popular products automatically |
| Notifications not created | Check `createNotification` called after transaction commits |

---

## 11. Future Enhancements

- Real-time notifications via WebSocket/Socket.io
- Shop verification badge
- Product sharing to external social media
- Advanced feed algorithm (ML-based recommendations)
- Hashtag search and trending topics
- Shop analytics dashboard
- Bulk product import/export

---

## Files Created/Modified

### New Files
- `prisma/schema.prisma` (updated)
- `src/shops/` (entire module)
- `src/products/` (entire module)
- `src/social/` (entire module)
- `src/notifications/` (entire module)
- `src/feed/` (entire module)

### Modified Files
- `src/app.module.ts` (added new modules)

All code follows NestJS best practices:
- Separation of concerns (Controller/Service/DTO)
- Proper validation with class-validator
- Swagger documentation
- Role-based access control
- Rate limiting
- Transaction-based counter updates
- Error handling with appropriate HTTP codes