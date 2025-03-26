import { Schema, model, models } from "mongoose";

const transactionSchema = new Schema({
	user_id: { type: Schema.Types.ObjectId, ref: "UserDetail" },
	order_id: { type: Schema.Types.ObjectId, ref: "Order" },
	razorpay_payment_id: { String },
	razorpay_order_id: { String },
	razorpay_signature: { String },
});

const Transaction =
	models.Transaction || model("Transaction", transactionSchema);

export default Transaction;
