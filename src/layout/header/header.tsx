"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/img/logo/logo.png";
import SearchPopup from "@/app/components/common/search-popup";
import OffCanvas from "@/app/components/common/off-canvas";
import MobileOffCanvas from "@/app/components/common/mobile-offcanvas";
import SvgIconCom from "@/app/components/common/svg-icon-anim";
import shape from "@/assets/img/icons/shape02.svg";
import { BtnBg } from "@/app/components/svg";
import HeaderNavMenus from "./header-nav-menus";
import StickyWrapper from "./sticky-wrapper";

interface UserData {
	id: string;
	email: string;
	name: string;
}

const Header = ({ style_2 = false }: { style_2?: boolean }) => {
	const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
	const [isOffCanvasOpen, setIsOffCanvasOpen] = useState<boolean>(false);
	const [openMobileOffCanvas, setOpenMobileOffCanvas] =
		useState<boolean>(false);
	const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
	const [userData, setUserData] = useState<UserData | null>(null);
	const [showDropdown, setShowDropdown] = useState<boolean>(false);

	// Check authentication status on component mount
	useEffect(() => {
		const checkAuth = () => {
			const token = localStorage.getItem("accessToken");
			const userJson = localStorage.getItem("user");

			if (token && userJson) {
				try {
					const user = JSON.parse(userJson) as UserData;
					setIsLoggedIn(true);
					setUserData(user);
				} catch (e) {
					console.error("Error parsing user data:", e);
					setIsLoggedIn(false);
					setUserData(null);
				}
			} else {
				setIsLoggedIn(false);
				setUserData(null);
			}
		};

		// Check initially
		checkAuth();

		// Set up event listener for storage changes (in case of login/logout in another tab)
		window.addEventListener("storage", checkAuth);

		// Custom event for login state changes within the same tab
		window.addEventListener("authStateChanged", checkAuth);

		// Click outside to close dropdown
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const dropdown = document.querySelector(".user-dropdown-container");
			if (dropdown && !dropdown.contains(target)) {
				setShowDropdown(false);
			}
		};

		document.addEventListener("click", handleClickOutside);

		return () => {
			window.removeEventListener("storage", checkAuth);
			window.removeEventListener("authStateChanged", checkAuth);
			document.removeEventListener("click", handleClickOutside);
		};
	}, []);

	// Handle user logout
	const handleLogout = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent event bubbling

		localStorage.removeItem("accessToken");
		localStorage.removeItem("refreshToken");
		localStorage.removeItem("user");
		setIsLoggedIn(false);
		setUserData(null);
		setShowDropdown(false);

		// Dispatch event to notify other components about auth state change
		window.dispatchEvent(new Event("authStateChanged"));

		// Redirect to home page after logout
		window.location.href = "/";
	};

	// handle open search
	const handleOpenSearch = (audioPath: string) => {
		setIsSearchOpen(true);
		const audio = new Audio(audioPath);
		audio.play();
	};
	// handle open offcanvas
	const handleOpenOffCanvas = (audioPath: string) => {
		setIsOffCanvasOpen(true);
		const audio = new Audio(audioPath);
		audio.play();
	};
	// handle open search
	const handleOpenMobileOffCanvas = (audioPath: string) => {
		setOpenMobileOffCanvas(true);
		const audio = new Audio(audioPath);
		audio.play();
	};

	// Toggle dropdown without audio
	const toggleDropdown = (e: React.MouseEvent) => {
		e.stopPropagation();
		setShowDropdown(!showDropdown);
	};

	return (
		<header>
			<StickyWrapper>
				<div className="container custom-container">
					<div className="row">
						<div className="col-12">
							<div
								className="mobile-nav-toggler"
								onClick={() =>
									handleOpenMobileOffCanvas(
										"/assets/audio/click.wav"
									)
								}
							>
								<i className="fas fa-bars"></i>
							</div>
							<div className="tgmenu__wrap">
								<nav className="tgmenu__nav">
									<div className="logo">
										<Link href="/">
											<Image
												src={logo}
												alt="Logo"
												style={{ height: "auto" }}
											/>
										</Link>
									</div>
									<div className="tgmenu__navbar-wrap tgmenu__main-menu d-none d-xl-flex">
										{/* nav menus */}
										<HeaderNavMenus />
										{/* nav menus */}
									</div>
									<div className="tgmenu__action d-none d-md-block">
										<ul className="list-wrap">
											<li className="search">
												<a
													onClick={() =>
														handleOpenSearch(
															"/assets/audio/click.wav"
														)
													}
													className="pointer"
												>
													<i className="flaticon-search-1"></i>
												</a>
											</li>
											<li className="header-btn">
												{isLoggedIn && userData ? (
													<div className="user-dropdown-container">
														<a
															className={`${style_2 ? "tg-btn-3 tg-svg" : "tg-border-btn"} d-flex align-items-center`}
															onClick={
																toggleDropdown
															}
															role="button"
														>
															<BtnBg />
															{style_2 && (
																<SvgIconCom
																	icon={shape}
																	id="svg-2"
																/>
															)}
															<i className="flaticon-user me-2"></i>{" "}
															{userData.name}
														</a>

														{showDropdown && (
															<div className="custom-dropdown">
																<Link
																	href="/creator-profile"
																	className="dropdown-item"
																>
																	<i className="fas fa-tachometer-alt me-2"></i>{" "}
																	Creator
																	Profile
																</Link>
																<Link
																	href="/profile"
																	className="dropdown-item"
																>
																	<i className="fas fa-user me-2"></i>{" "}
																	Profile
																</Link>
																<button
																	onClick={
																		handleLogout
																	}
																	className="dropdown-item logout-item"
																>
																	<i className="fas fa-sign-out-alt me-2"></i>{" "}
																	Logout
																</button>
															</div>
														)}
													</div>
												) : (
													<Link
														href="/login"
														className="tg-btn-3 tg-svg d-flex align-items-center"
													>
														<SvgIconCom
															icon={shape}
															id="svg-2"
														/>
														<i className="flaticon-edit me-2"></i>{" "}
														Login
													</Link>
												)}
											</li>
											<li
												className="side-toggle-icon"
												onClick={() =>
													handleOpenOffCanvas(
														"/assets/audio/click.wav"
													)
												}
											>
												<span></span>
												<span></span>
												<span></span>
											</li>
										</ul>
									</div>
								</nav>
							</div>
						</div>
					</div>
				</div>
			</StickyWrapper>

			{/* <!-- header-search --> */}
			<SearchPopup
				setIsSearchOpen={setIsSearchOpen}
				isSearchOpen={isSearchOpen}
			/>
			{/* <!-- header-search-end --> */}

			{/* off canvas start */}
			<OffCanvas
				isOffCanvasOpen={isOffCanvasOpen}
				setIsOffCanvasOpen={setIsOffCanvasOpen}
			/>
			{/* off canvas end */}

			{/*mobile off canvas start */}
			<MobileOffCanvas
				openMobileOffCanvas={openMobileOffCanvas}
				setOpenMobileOffCanvas={setOpenMobileOffCanvas}
			/>
			{/*mobile off canvas end */}

			{/* Add custom CSS for better Bootstrap integration */}
			<style
				jsx
				global
			>{`
				.dropdown-menu.bg-dark {
					background-color: #1a1c25 !important;
				}

				.dropdown-menu .dropdown-item:hover {
					background-color: rgba(255, 255, 255, 0.05);
				}

				.dropdown-menu .dropdown-item.text-light:hover {
					color: var(--tg-theme-primary) !important;
				}

				.dropdown-menu .dropdown-item.text-danger:hover {
					color: #ff8f8f !important;
				}

				.dropdown-menu {
					animation: fadeIn 0.2s ease-out;
				}

				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(-10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.user-dropdown-container {
					position: relative;
				}

				.custom-dropdown {
					position: absolute;
					top: 100%;
					right: 0;
					margin-top: 10px;
					min-width: 220px;
					background-color: #1a1c25;
					border: 1px solid #2d2e39;
					border-radius: 6px;
					z-index: 1000;
					overflow: hidden;
					box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
					animation: fadeIn 0.2s ease-out;
				}

				.custom-dropdown .dropdown-item {
					display: block;
					padding: 12px 16px;
					color: #ffffff;
					text-decoration: none;
					border-bottom: 1px solid rgba(45, 46, 57, 0.5);
					transition: all 0.2s ease;
				}

				.custom-dropdown .dropdown-item:hover {
					background-color: rgba(255, 255, 255, 0.05);
					color: var(--tg-theme-primary);
				}

				.custom-dropdown .logout-item {
					color: #ff6b6b;
					background: transparent;
					border: none;
					width: 100%;
					text-align: left;
					cursor: pointer;
				}

				.custom-dropdown .logout-item:hover {
					background-color: rgba(255, 107, 107, 0.1);
					color: #ff8f8f;
				}

				@keyframes fadeIn {
					from {
						opacity: 0;
						transform: translateY(-10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>
		</header>
	);
};

export default Header;
