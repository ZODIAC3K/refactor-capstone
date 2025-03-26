import { Schema, model, models } from "mongoose";

const shaderSchema = new Schema(
	{
		product_id: {
			type: Schema.Types.ObjectId,
			ref: "Product",
			required: true,
		},
		shaderType: {
			type: String,
			enum: ["full-body", "partial-body"],
			required: true,
		},
		shaderImage: {
			type: Schema.Types.ObjectId,
			ref: "Image",
			required: true,
		},
		mapping: {
			scale: {
				x: { type: Number, default: 1 },
				y: { type: Number, default: 1 },
			},
			offset: {
				x: { type: Number, default: 0 },
				y: { type: Number, default: 0 },
			},
			rotation: { type: Number, default: 0 },
		},
	},
	{ timestamps: true }
);

const shaderModel = models.shaderSchema || model("shaderSchema", shaderSchema);

export default shaderModel;
