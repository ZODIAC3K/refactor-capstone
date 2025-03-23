// "use client";
import Link from 'next/link'
import { Metadata } from 'next'
import Wrapper from '@/layout/wrapper'
// import Header from "@/layout/header/header";
// import Footer from "@/layout/footer/footer";
// import BreadcrumbArea from "../components/breadcrumb/breadcrumb-area";
// import brd_bg from "@/assets/img/bg/breadcrumb_bg01.jpg";
// import brd_img from "@/assets/img/others/breadcrumb_img02.png";
// import { GoogleSvg } from "../components/svg";
import LoginForm from '@/app/components/forms/login-form'

export const metadata: Metadata = {
    title: 'Login Page'
}

export default function LoginPage() {
    return (
        <Wrapper>
            <main className='main--area'>
                <section
                    className='signup__area team-bg section-pt-120 section-pb-120'
                    style={{
                        backgroundImage: `url(/assets/img/bg/team_bg.jpg)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                    }}
                >
                    <div
                        className='container'
                        style={{
                            marginTop: '5rem',
                            marginBottom: '5rem'
                        }}
                    >
                        <div className='row justify-content-center'>
                            <div className='col-xl-6 col-lg-8'>
                                <div className='singUp-wrap'>
                                    <h2 className='title'>Welcome back!</h2>
                                    <p>
                                        Hey there! Ready to log in? Just enter your username and password below and you
                                        will be back in action in no time. Let's go!
                                    </p>
                                    <LoginForm />

                                    <div className='account__switch'>
                                        <p>
                                            Don't have an account?
                                            <Link href='/register'>Sign Up</Link>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </Wrapper>
    )
}
