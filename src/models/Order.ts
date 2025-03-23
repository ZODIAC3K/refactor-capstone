import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    orderDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    orderStatus: {
        type: String,
        enum: ['Processing', 'Shipped', 'Delivered', 'Canceled'],
        default: 'Processing',
        index: true
    },
    shippingAddressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    },
    billingAddressId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
    },
    totalAmount: Number,
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Failed', 'Refunded'],
        index: true
    },
    canModify: Boolean,
    trackingId: String,
    estimatedDelivery: Date,
    cancellationReason: String
})

const orderItemSchema = new mongoose.Schema({
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductVariant'
    },
    quantity: Number,
    discountedPrice: Number,
    appliedCouponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductCoupon'
    },
    appliedOfferId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProductOffer'
    }
})

// Create compound index for user orders
orderSchema.index({ userId: 1, orderDate: 1 }, { name: 'idx_user_orders' })

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema)
export const OrderItem = mongoose.models.OrderItem || mongoose.model('OrderItem', orderItemSchema)
