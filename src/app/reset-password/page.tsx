import Link from 'next/link'
import { Metadata } from 'next'
import Wrapper from '@/layout/wrapper'
import Header from '@/layout/header/header'
import Footer from '@/layout/footer/footer'
import BreadcrumbArea from '../components/breadcrumb/breadcrumb-area'
import brd_bg from '@/assets/img/bg/breadcrumb_bg01.jpg'
import brd_img from '@/assets/img/others/breadcrumb_img02.png'
import ResetPassForm from '../components/forms/reset-pass-form'

export const metadata: Metadata = {
    title: 'Reset Password Page'
}

export default function ResetPasswordPage() {
    return (
        <Wrapper>
            {/* main area start */}
            <main className='main--area'>
                {/* reset password area start */}
                <section
                    className='signup__area team-bg section-pt-120 section-pb-120'
                    style={{
                        backgroundImage: `url(/assets/img/bg/team_bg.jpg)`
                    }}
                >
                    <div className='container'>
                        <div
                            className='row justify-content-center'
                            style={{
                                height: `80vh`
                            }}
                        >
                            <div className='col-xl-8 col-lg-8 d-flex align-items-center justify-content-center'>
                                <div className='singUp-wrap'>
                                    <h2 className='title'>Forgot Password!</h2>
                                    <p>Enter your email address to request password reset.</p>
                                    {/* form start */}
                                    <ResetPassForm />
                                    {/* form end */}
                                    <div className='account__switch'>
                                        <p>
                                            Remember Password?
                                            <Link href='/login'>Login</Link>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                {/* reset password area end */}
            </main>
        </Wrapper>
    )
}
