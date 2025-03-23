'use client'
import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import shape from '@/assets/img/icons/shape.svg'
import SvgIconCom from '../common/svg-icon-anim'
import circel from '@/assets/img/icons/circle.svg'
import fun_fact_shape from '@/assets/img/others/fun_fact_shape.png'
import fun_fact from '@/assets/img/others/fun_fact2.png'
import trophy from '@/assets/img/icons/trophy.png'
import VideoPopup from '../common/video-popup'
import CounterUp from '../common/counter-up'
import { bottom } from '@popperjs/core'

const AboutAreaTwo = () => {
    const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false)
    const imgStyle = { height: 'auto', width: 'auto' }
    return (
        <>
            <section className='about__area-two section-pt-160 section-pb-190' style={{ paddingBottom: '3rem' }}>
                <div className='container'>
                    <div className='row justify-content-center align-items-center'>
                        <div className='col-xl-6 col-lg-6 order-0 order-lg-2'>
                            <div className='about__funFact-images'>
                                <Image src={fun_fact_shape} alt='background' className='bg-shap' />
                                <Image
                                    src={fun_fact}
                                    className='main-img'
                                    alt='image'
                                    style={{
                                        height: 'auto',
                                        marginBottom: '1.5rem',
                                        marginTop: '1.5rem'
                                    }}
                                />
                            </div>
                            {/* <div className="about__funFact-trophy">
								<div className="icon">
									<Image
										src={trophy}
										alt="trophy"
										style={imgStyle}
									/>
								</div>
								<div className="content">
									<h5>Tournament</h5>
									<span>Development</span>
								</div>
							</div> */}
                        </div>
                        <div className='col-xl-6 col-lg-6 col-md-10'>
                            <div className='section__title text-start mb-30'>
                                <h3 className='title'>
                                    Revolutionize Your Fashion Journey
                                    <br /> With AI Creativity
                                </h3>
                            </div>
                            <div className='about__content-two'>
                                <p>
                                    Unleash your creativity and design your own clothing line, organizing your
                                    masterpieces into catalogs like curated playlists. Earn royalties on every sale,
                                    with up to 40% of the profits, while we take care of the platform. Your personalized
                                    dashboard lets you effortlessly manage your designs, sales, and earnings—making it
                                    easy to build your fashion empire.
                                </p>
                            </div>
                            <div className='about__content-bottom'>
                                <div className='about__content-btns mt-0'>
                                    <Link href='/contact' className='tg-btn-3 tg-svg'>
                                        <SvgIconCom icon={shape} id='svg-6' />
                                        <span>read more</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* video modal start */}
            <VideoPopup isVideoOpen={isVideoOpen} setIsVideoOpen={setIsVideoOpen} videoId={'ssrNcwxALS4'} />
            {/* video modal end */}
        </>
    )
}

export default AboutAreaTwo
