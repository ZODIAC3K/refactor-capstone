import { Schema, model, models } from "mongoose";

const addressSchema = new Schema(
	{
		user_id: {
			type: Schema.Types.ObjectId,
			ref: "UserDetail",
			required: true,
		},
		address: {
			firstLine: { type: String, required: true },
			secondLine: String,
			pincode: { type: Number, required: true },
			city: { type: String, required: true },
			state: { type: String, required: true },
		},
		default: { type: Boolean, default: false },
	},
	{
		timestamps: true,
	}
);

// Changed to match the ref "Address" in userSchema.ts
const AddressModel = models.Address || model("Address", addressSchema);

export { AddressModel, addressSchema };
