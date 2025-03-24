"use client";

import { Metadata } from "next";
import { useEffect, useState } from "react";
import Wrapper from "@/layout/wrapper";
import Header from "@/layout/header/header";
import Footer from "@/layout/footer/footer";
import BreadcrumbArea from "../components/breadcrumb/breadcrumb-area";
import brd_bg from "@/assets/img/bg/breadcrumb_bg01.jpg";
import brd_img from "@/assets/img/team/breadcrumb_team.png";
import TeamDetailsArea from "../components/team/team-details-area";
import TeamArea from "../components/team/team-area";
import BrandArea from "../components/brand/brand-area";

// We can't use export const metadata with client components
// So we'll need to handle metadata differently

export default function CreatorProfilePage() {
	const [userName, setUserName] = useState("Creator Profile");

	useEffect(() => {
		// Read user data from localStorage
		const userJson = localStorage.getItem("user");
		if (userJson) {
			try {
				const userData = JSON.parse(userJson);
				if (userData && userData.name) {
					setUserName(userData.name);
				}
			} catch (error) {
				console.error("Error parsing user data:", error);
			}
		}
	}, []);

	return (
		<Wrapper>
			{/* header start */}
			<Header />
			{/* header end */}

			{/* main area start */}
			<main className="main--area">
				{/* breadcrumb area start */}
				<BreadcrumbArea
					title={userName}
					subtitle="CREATOR PROFILE"
					bg={brd_bg}
					brd_img={brd_img}
				/>
				{/* breadcrumb area end */}

				{/* team details area start */}
				<TeamDetailsArea />
				{/* team details area end */}

				{/* team area start */}
				<TeamArea />
				{/* team area end */}

				{/*  */}
				<BrandArea />
			</main>
			{/* main area end */}

			{/* footer start */}
			<Footer />
			{/* footer end */}
		</Wrapper>
	);
}
