export * from './user.entity';
export * from './rbac.entity';
export * from './catalog.entity';
export * from './product.entity';
export * from './inventory.entity';
export * from './cart.entity';
export * from './order.entity';
export * from './shipping.entity';
export * from './engagement.entity';
export * from './cms.entity';
export * from './system.entity';
export * from './wallet.entity';

import { User, UserAddress, VerificationCode, RefreshToken } from './user.entity';
import { Role, Permission, PermissionUser, RoleUser } from './rbac.entity';
import { Brand, Category, Attribute, AttributeValue, CategoryAttribute } from './catalog.entity';
import {
  Product,
  ProductVariant,
  ProductVariantValue,
  ProductImage,
  ProductVideo,
  Tag,
  ProductTag,
  ProductRelation,
  ProductAttributeValue,
} from './product.entity';
import { Warehouse, Inventory, StockMovement } from './inventory.entity';
import { Coupon, Cart, CartItem, CouponUsage } from './cart.entity';
import { Order, OrderItem, OrderStatusHistory, Payment, Shipment } from './order.entity';
import { ShippingZone, ShippingMethod } from './shipping.entity';
import { Review, ProductQuestion, Wishlist, ProductCompare } from './engagement.entity';
import { Banner, Page, Ticket, TicketMessage } from './cms.entity';
import { Notification, PushSubscription, Setting, AuditLog, FileRecord } from './system.entity';
import { Wallet, WalletTransaction } from './wallet.entity';

export const ALL_ENTITIES = [
  User, UserAddress, VerificationCode, RefreshToken,
  Role, Permission, PermissionUser, RoleUser,
  Brand, Category, Attribute, AttributeValue, CategoryAttribute,
  Product, ProductVariant, ProductVariantValue, ProductImage, ProductVideo,
  Tag, ProductTag, ProductRelation, ProductAttributeValue,
  Warehouse, Inventory, StockMovement,
  Coupon, Cart, CartItem, CouponUsage,
  Order, OrderItem, OrderStatusHistory, Payment, Shipment,
  ShippingZone, ShippingMethod,
  Review, ProductQuestion, Wishlist, ProductCompare,
  Banner, Page, Ticket, TicketMessage,
  Notification, PushSubscription, Setting, AuditLog, FileRecord,
  Wallet, WalletTransaction,
];
