'use client'
import React from 'react'
import Link from 'next/link'
import banner_bg from '@/assets/img/slider/banner_bg_shape5-1.png'
import shape from '@/assets/img/icons/shape.svg'
import shape03 from '@/assets/img/icons/shape03.svg'
import SvgIconCom from '../common/svg-icon-anim'

const HeroBannerTwo = () => {
    return (
        <section className='banner__area banner__padding absolute'>
            <div className='banner__bg tg-jarallax' style={{ backgroundImage: `url(${banner_bg.src})` }}></div>
            <div className='container custom-container'>
                <div className='row justify-content-center'>
                    <div className='col-xl-8 col-lg-10'>
                        <div className='banner__content slider__content text-center'>
                            <h2 className='title wow bounceInLeft' data-wow-delay='.2s'>
                                Unleash Your Creativity
                            </h2>
                            <p className='wow bounceInLeft' data-wow-delay='.4s'>
                                Design, Style, and Shop with AI
                            </p>
                            <div className='d-flex justify-content-center align-items-center gap-4'>
                                <div
                                    className='banner__btn d-flex justify-content-center wow bounceInLeft'
                                    data-wow-delay='.6s'
                                >
                                    {/* <Link
										href="/contact"
										className="tg-btn-3 tg-svg mx-auto"
									>
										<SvgIconCom
											icon={shape03}
											id="svg-1"
										/>
										<span className="text-white">Shop</span>
									</Link> */}
                                    <div className='about__content-btns m-0'>
                                        <Link href='/contact' className='tg-btn-3 tg-svg'>
                                            <SvgIconCom icon={shape} id='svg-6' />
                                            <span>Customize</span>
                                        </Link>
                                    </div>
                                </div>
                                <div
                                    className='banner__btn d-flex justify-content-center wow bounceInLeft'
                                    data-wow-delay='.6s'
                                >
                                    <Link href='/contact' className='tg-btn-1 tg-svg '>
                                        <SvgIconCom icon={shape} id='svg-6' />
                                        <span>Shop</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default HeroBannerTwo
