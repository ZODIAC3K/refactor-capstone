import {
	S3Client,
	PutObjectCommand,
	PutObjectCommandInput,
} from "@aws-sdk/client-s3";

// Initialize S3 client
const s3Client = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

interface UploadResult {
	success: boolean;
	url?: string;
	error?: string;
}

/**
 * Uploads a file to S3 bucket and returns the URL
 * @param file - The file buffer to upload
 * @param fileName - Name to use for the file in S3
 * @param mimeType - MIME type of the file (e.g., 'model/gltf-binary' for .glb files)
 * @returns Promise with upload result containing success status and URL or error
 */
export async function uploadObjectToS3(
	file: Buffer,
	fileName: string,
	mimeType: string
): Promise<UploadResult> {
	try {
		// Ensure environment variables are set
		if (!process.env.AWS_BUCKET_NAME) {
			throw new Error("AWS bucket name not configured");
		}

		// Create unique file name to avoid overwrites
		const uniqueFileName = `${Date.now()}-${fileName}`;

		// Set up the upload parameters
		const uploadParams = {
			Bucket: process.env.AWS_BUCKET_NAME,
			Key: `models/${uniqueFileName}`,
			Body: file,
			ContentType: mimeType,
		};

		// Upload to S3
		const command = new PutObjectCommand(
			uploadParams as PutObjectCommandInput
		);
		await s3Client.send(command);

		// Construct the URL
		const objectUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/models/${uniqueFileName}`;

		return {
			success: true,
			url: objectUrl,
		};
	} catch (error) {
		console.error("Error uploading to S3:", error);
		return {
			success: false,
			error:
				error instanceof Error
					? error.message
					: "Unknown error occurred",
		};
	}
}
