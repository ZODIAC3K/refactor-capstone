import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    description: String,
    brand: {
        type: String,
        index: true
    },
    images: [String],
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    shaders: mongoose.Schema.Types.Mixed,
    royaltyPercentage: Number,
    tags: [String],
    rating: {
        type: Number,
        default: 0
    },
    reviewsCount: {
        type: Number,
        default: 0
    },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Warehouse'
    },
    use_stock_price: {
        type: Boolean,
        default: false
    }
})

const productVariantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    size: String,
    color: String,
    price: Number,
    stock: Number
})

// Create compound index for product search
productSchema.index({ name: 1, brand: 1 }, { name: 'idx_product_search' })
// Create compound index for product variant uniqueness
productVariantSchema.index({ productId: 1, size: 1, color: 1 }, { unique: true })

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema)
export const ProductVariant = mongoose.models.ProductVariant || mongoose.model('ProductVariant', productVariantSchema)
