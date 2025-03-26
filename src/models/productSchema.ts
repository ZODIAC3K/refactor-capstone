import { Schema, model, models } from "mongoose";

const productDetailsSchema = new Schema(
	{
		title: { type: String, required: true, unique: true },
		description: { type: String, required: true },
		category: [{ type: Schema.Types.ObjectId, ref: "Category" }],
		model_id: { type: Schema.Types.ObjectId, ref: "Object" },
		rating: { type: Number, default: 0 },
		creator: {
			type: Schema.Types.ObjectId,
			ref: "Creator",
			required: true,
		},
		shader: { type: Schema.Types.ObjectId, ref: "Shader" },
		price: {
			amount: { type: Number, required: true },
			currency: {
				type: String,
				required: true,
				enum: ["INR", "USD", "EUR"],
				default: "INR",
			},
		},
		sales_count: {
			type: Number,
			default: 0,
			min: 0,
		},
	},
	{ timestamps: true }
);

const productModel = models.Product || model("Product", productDetailsSchema);

export default productModel;
