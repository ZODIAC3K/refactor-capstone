import { Schema, model, models } from "mongoose";

const returnSchema = new Schema(
	{
		order_id: {
			type: Schema.Types.ObjectId,
			ref: "Order",
			required: true,
		},
		user_id: {
			type: Schema.Types.ObjectId,
			ref: "UserDetail",
			required: true,
		},
		status: {
			type: String,
			enum: [
				"Requested",
				"Approved",
				"Rejected",
				"Processing",
				"Completed",
			],
			default: "Requested",
		},
		return_reason: {
			type: String,
			required: true,
		},
		refund_transaction_id: {
			type: Schema.Types.ObjectId,
			ref: "Transaction",
		},
		admin_notes: {
			type: String,
		},
		return_address: {
			type: Schema.Types.ObjectId,
			ref: "Address",
			required: true,
		},
	},
	{ timestamps: true }
);

const ReturnModel = models.Return || model("Return", returnSchema);

export default ReturnModel;
