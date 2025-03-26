import { Schema, model, models } from "mongoose";

const objectSchema = new Schema(
	{
		name: { type: String, required: true, unique: true },
		modelUrl: { type: String, required: true },
		description: { type: String },
		position: {
			x: { type: Number, default: 0 },
			y: { type: Number, default: 0 },
			z: { type: Number, default: 0 },
		},
		rotation: {
			x: { type: Number, default: 0 },
			y: { type: Number, default: 0 },
			z: { type: Number, default: 0 },
		},
		scale: {
			x: { type: Number, default: 1 },
			y: { type: Number, default: 1 },
			z: { type: Number, default: 1 },
		},
		created_at: { type: Date, default: Date.now },
	},
	{
		timestamps: true,
	}
);

const objectModel = models.Object || model("Object", objectSchema);

export default objectModel;
