import mongoose from 'mongoose'
import { User, UserDetails } from './User'
import { Product, ProductVariant } from './Product'
import { Order, OrderItem } from './Order'
// Import other models...

// Export all models
export {
    User,
    UserDetails,
    Product,
    ProductVariant,
    Order,
    OrderItem
    // ... other models
}

// Optional: Connect to MongoDB function
export const connectDB = async () => {
    try {
        if (mongoose.connection.readyState >= 1) return

        return mongoose.connect(process.env.MONGODB_URI!)
    } catch (error) {
        console.error('MongoDB connection error:', error)
    }
}
