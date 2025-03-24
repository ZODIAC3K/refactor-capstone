"use client";
import React, { useEffect, useState } from "react";
import { animationCreate } from "@/lib/sendEmailVerification";
import BackToTopCom from "@/app/components/common/back-to-top-com";
import { ToastContainer } from "react-toastify";

import AnimateMouse from "@/app/components/common/animated-mouse";
import ContextProvider from "@/context/app-context";

if (typeof window !== "undefined") {
	require("bootstrap/dist/js/bootstrap");
}

type IProps = {
	children: React.ReactNode;
	bodyCls?: string;
};

const Wrapper = ({ children, bodyCls }: IProps) => {
	const [bodyClsState, setBodyClsState] = useState<string>(bodyCls || "");

	useEffect(() => {
		animationCreate();
	}, []);

	useEffect(() => {
		if (bodyClsState) {
			document.body.classList.add(bodyClsState);
		}
		return () => {
			if (bodyClsState) {
				document.body.classList.remove(bodyClsState);
			}
		};
	}, [bodyClsState]);

	return (
		<ContextProvider>
			<AnimateMouse />
			{children}
			<BackToTopCom />
			<ToastContainer />
		</ContextProvider>
	);
};

export default Wrapper;
