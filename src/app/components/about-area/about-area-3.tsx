import React from 'react'
import Image from 'next/image'
import TextAnimation from '../common/text-animation'
import AboutDots from '../svg/about-dots'
import Circle from '../svg/circle'
import circle_img from '@/assets/img/icons/circle.svg'
import mask_img from '@/assets/img/others/luffy_pfp.png'
import mask_img_2 from '@/assets/img/others/mask_img02.jpg'

const AboutAreaThree = () => {
    return (
        <section className='about__area-three section-pt-130 section-pb-130'>
            <div className='container'>
                <div className='row'>
                    <div className='col-xl-4'>
                        <div className='about__title-wrap'>
                            <h2 className='title'>
                                <i>We Are Creators</i>
                                <span>Innovators.</span>
                                <i>Redefining Fashion</i>
                                <i>
                                    with <b>AI</b>
                                </i>
                            </h2>
                            <div className='about__content-circle'>
                                <Image src={circle_img} alt='img' />
                                <Circle />
                            </div>
                        </div>
                    </div>
                    <div className='col-xl-8'>
                        <div className='about__three-images'>
                            <Image src={mask_img} alt='img' className='left' />
                            <Image src={mask_img_2} alt='img' className='right' />
                            <div className='about__dots'>
                                <AboutDots />
                            </div>
                        </div>
                        <div className='about__three-paragraph'>
                            <TextAnimation
                                style_2={true}
                                title="We are creators and innovators, redefining fashion with technology. Our platform lets you design your own clothing line, curate catalogs, and earn royalties for every sale. With a personalized dashboard, you can easily manage your designs, track earnings, and grow your brand. It's where creativity meets opportunity, powered by AI."
                            />
                        </div>
                    </div>
                </div>
            </div>
            <h2 className='big-title'>online</h2>
        </section>
    )
}

export default AboutAreaThree
