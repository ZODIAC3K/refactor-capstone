import { model, models, Schema } from "mongoose";

const CreatorSchema = new Schema(
	{
		userId: {
			type: Schema.Types.ObjectId,
			ref: "UserDetail",
			required: true,
		},

		name: {
			type: String,
			required: true,
		},

		bio: {
			type: String,
			default: "",
		},

		quote: {
			type: String,
			default: "",
		},

		creatorProfilePicture: {
			type: Schema.Types.ObjectId,
			ref: "ImageDetail",
			default: "",
		},

		creatorCoverImage: {
			type: Schema.Types.ObjectId,
			ref: "ImageDetail",
			default: "",
		},

		socialLinks: {
			type: Map,
			of: String,
			default: {},
		},

		products: [
			{
				type: Schema.Types.ObjectId,
				ref: "Product",
			},
		],

		totalSales: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: true }
);

const CreatorModel = models.Creator || model("Creator", CreatorSchema);

export { CreatorModel };
