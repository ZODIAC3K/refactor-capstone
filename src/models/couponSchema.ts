import { Schema, model, models } from "mongoose";

const couponSchema = new Schema(
	{
		discount: Number,
		title: String,
		description: String,
		end_at: { type: Date, required: true },
		code: { type: String, required: true, unique: true },
	},
	{
		timestamps: true,
	}
);

const CouponDetails = models.Coupon || model("Coupon", couponSchema);

export default CouponDetails;
