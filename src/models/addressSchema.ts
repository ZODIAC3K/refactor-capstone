import { Schema, model, models } from "mongoose";

const addressSchema = new Schema(
	{
		user_id: {
			type: Schema.Types.ObjectId,
			ref: "User",
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

// Use 'Address' as the model name to match the ref in UserModel
const AddressModel =
	models.addressschema || model("addressschema", addressSchema);

export { AddressModel, addressSchema };
