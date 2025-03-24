"use client";
import React, { useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import ErrorMsg from "../common/err-message";
import { notifySuccess, notifyError } from "@/utils/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface IFormInput {
	email: string;
	password: string;
}

export default function LoginForm() {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<IFormInput>();

	const onSubmit: SubmitHandler<IFormInput> = async (data) => {
		setIsLoading(true);
		try {
			const response = await fetch("/api/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			const responseData = await response.json();

			if (!response.ok) {
				throw new Error(responseData.error || "Login failed");
			}

			// Store tokens in localStorage (client-side only)
			localStorage.setItem("accessToken", responseData.accessToken);
			localStorage.setItem("refreshToken", responseData.refreshToken);

			// Store user info
			if (responseData.user) {
				localStorage.setItem("user", JSON.stringify(responseData.user));
			}

			// Dispatch custom event to update UI
			window.dispatchEvent(new Event("authStateChanged"));

			notifySuccess("Login successful!");

			// Redirect to dashboard after successful login
			setTimeout(() => {
				router.push("/creator-profile");
			}, 1000);
		} catch (error) {
			console.error("Login error:", error);
			notifyError(
				error instanceof Error ? error.message : "Login failed!"
			);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="account__form"
		>
			<ErrorMsg msg={errors.email?.message as string} />
			<div className="form-grp">
				<label htmlFor="email">Email</label>
				<input
					{...register("email", {
						required: `Email is required!`,
						pattern: {
							value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
							message: "Invalid email address",
						},
					})}
					id="email"
					type="email"
					placeholder="Your Email"
					disabled={isLoading}
				/>
			</div>

			<ErrorMsg msg={errors.password?.message as string} />
			<div className="form-grp">
				<label htmlFor="password">Password</label>
				<input
					{...register("password", {
						required: `Password is required!`,
						minLength: {
							value: 6,
							message: "Password must be at least 6 characters",
						},
					})}
					id="password"
					type="password"
					placeholder="Password"
					disabled={isLoading}
				/>
			</div>

			<div className="account__check">
				<div className="account__check-remember">
					<input
						type="checkbox"
						className="form-check-input"
						id="terms-check"
					/>
					<label
						htmlFor="terms-check"
						className="form-check-label"
					>
						Remember me
					</label>
				</div>
				<div className="account__check-forgot">
					<Link href="/reset-password">Forgot Password?</Link>
				</div>
			</div>

			<button
				type="submit"
				className="btn btn-two arrow-btn"
				disabled={isLoading}
			>
				{isLoading ? (
					<>
						<span
							className="spinner-border spinner-border-sm me-2"
							role="status"
							aria-hidden="true"
						></span>
						Logging in...
					</>
				) : (
					"Login"
				)}
			</button>
		</form>
	);
}
