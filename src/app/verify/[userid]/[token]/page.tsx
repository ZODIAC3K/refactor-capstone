"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

// Define the possible status values as a type
type VerificationStatus = "pending" | "success" | "error";

export default function VerifyEmailPage() {
	// Get params using the useParams hook
	const params = useParams();

	// Parse userid and token from params
	const userid = params.userid as string;
	const token = params.token as string;

	console.log(" === params === ", params);

	// State for verification status and message
	const [status, setStatus] = useState<VerificationStatus>("pending");
	const [message, setMessage] = useState("Verifying your email...");

	// Effect to handle verification
	useEffect(() => {
		const verifyEmail = async () => {
			console.log(" === userid === ", userid);
			console.log(" === token === ", token);

			try {
				const response = await fetch("/api/verify-email", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userid, token }),
				});

				const data = await response.json();

				if (response.ok) {
					setStatus("success");
					setMessage("Your email has been successfully verified!");
				} else {
					setStatus("error");
					setMessage(
						data.message || "Verification failed. Please try again."
					);
				}
			} catch (error) {
				setStatus("error");
				setMessage(
					"An error occurred during verification. Please try again later."
				);
				console.error("Verification error:", error);
			}
		};

		verifyEmail();
	}, [userid, token]);

	return (
		<div className="container d-flex justify-content-center align-items-center min-vh-100">
			<div
				className="card border-0 bg-transparent text-white"
				style={{ maxWidth: "420px" }}
			>
				<div className="card-header bg-transparent border-0 text-center text-white">
					<h4 className="card-title mb-0">
						{status === "success"
							? "Verification Successful"
							: status === "error"
								? "Verification Failed"
								: "Verifying Email"}
					</h4>
				</div>

				<div className="card-body text-center">
					<div className="mb-4">
						{status === "success" && (
							<div className="d-inline-flex justify-content-center align-items-center rounded-circle p-3 bg-white bg-opacity-10">
								<svg
									width="32"
									height="32"
									fill="none"
									viewBox="0 0 24 24"
									stroke="white"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</div>
						)}
						{status === "error" && (
							<div className="d-inline-flex justify-content-center align-items-center rounded-circle p-3 bg-white bg-opacity-10">
								<svg
									width="32"
									height="32"
									fill="none"
									viewBox="0 0 24 24"
									stroke="white"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</div>
						)}
						{status === "pending" && (
							<div className="d-inline-flex justify-content-center align-items-center rounded-circle p-3 bg-white bg-opacity-10">
								<div
									className="spinner-border text-white"
									role="status"
									style={{ width: "2rem", height: "2rem" }}
								>
									<span className="visually-hidden">
										Loading...
									</span>
								</div>
							</div>
						)}
					</div>

					<p className="fs-5 mb-4 text-white">{message}</p>

					<div className="d-grid gap-2 col-8 mx-auto">
						{status === "success" && (
							<a
								href="/login"
								className="btn btn-outline-light d-inline-flex align-items-center justify-content-center"
							>
								<svg
									width="20"
									height="20"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									className="me-2"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
									/>
								</svg>
								Go to Login
							</a>
						)}
						{status === "error" && (
							<a
								href="/"
								className="btn btn-outline-light d-inline-flex align-items-center justify-content-center"
							>
								<svg
									width="20"
									height="20"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									className="me-2"
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7m-14 0l2-2"
									/>
								</svg>
								Return to Home
							</a>
						)}
					</div>
				</div>
			</div>

			{status === "success" && (
				<div className="position-absolute bottom-0 mb-4 text-center text-white">
					<p className="small">
						Your account is now verified. You can sign in using your
						email and password.
					</p>
				</div>
			)}
		</div>
	);
}
