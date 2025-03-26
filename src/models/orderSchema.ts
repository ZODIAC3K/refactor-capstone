import { Schema, model, models } from "mongoose";

const orderSchema = new Schema(
	{
		user_id: { type: Schema.Types.ObjectId, ref: "UserDetail" },
		status: { type: String, default: "Processing" }, // [Placed, Shipped, Delivered, Cancelled, Failed] (Admin) ==> if Cancelled then refund the amount using razorpay.
		product_ordered: [{ type: Schema.Types.ObjectId, ref: "Product" }],
		size_ordered: [String], // size of the product.
		quantity_ordered: [Number], // quantity of the product.
		coupon_used: { type: Schema.Types.Mixed, ref: "Coupon" }, // on over all order.
		offer_used: [{ type: Schema.Types.Mixed, ref: "Offer" }], // on each product.
		total_amount: Number,
		amount_paid: Number,
		address: { type: Schema.Types.ObjectId, ref: "Address" },
		transcation_id: {
			type: Schema.Types.ObjectId,
			ref: "Transaction",
		},
	},
	{ timestamps: true }
);

const orderModel = models.Order || model("Order", orderSchema);

export default orderModel;
