import { Schema, model, models } from "mongoose";

const offerSchema = new Schema(
	{
		offer_discount: Number,
		title: String,
		description: String,
		applicable_on: [{ type: Schema.Types.ObjectId, ref: "Product" }],
		code: String,
		end_at: Date,
	},
	{ timestamps: true }
);

const offerModal = models.offerSchema || model("offerSchema", offerSchema);

export default offerModal;
