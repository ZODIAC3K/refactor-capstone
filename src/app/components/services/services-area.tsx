'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import service_img_1 from '@/assets/img/others/inovation2.jpg'
import service_img_2 from '@/assets/img/others/exp.jpg'
import service_img_3 from '@/assets/img/others/ai_faishon.jpg'
import service_img_4 from '@/assets/img/others/global.jpg'
import Link from 'next/link'

// service images
const service_images = [service_img_1, service_img_2, service_img_3, service_img_4]
const service_items: {
    id: number
    icon: string
    title: string
    desc: string
}[] = [
    {
        id: 1,
        icon: 'flaticon-diamond',
        title: 'Years of Innovation',
        desc: "With our expertise, we're transforming how fashion is created and experienced. Design, curate, and sell your clothing line seamlessly, powered by cutting-edge technology."
    },
    {
        id: 2,
        icon: 'flaticon-user-profile',
        title: 'Expert Support',
        desc: 'Our team is here to ensure your creative journey is smooth and successful, offering personalized tools and guidance every step of the way.'
    },
    {
        id: 3,
        icon: 'flaticon-ethereum',
        title: 'AI-Driven Fashion',
        desc: 'Experience the future of fashion with AI-powered design tools and personalized recommendations, making creativity and innovation effortless.'
    },
    {
        id: 4,
        icon: 'flaticon-settings-1',
        title: 'Global Reach',
        desc: 'Join a worldwide community of creators and buyers, connecting fashion enthusiasts everywhere to unique, one-of-a-kind styles.'
    }
]

const ServicesArea = () => {
    const [activeIndex, setActiveIndex] = useState<number | null>(0)

    const handleMouseOver = (index: number) => {
        setActiveIndex(index)
    }

    const handleMouseOut = (index: number) => {
        setActiveIndex(index)
    }
    return (
        <section className='services-area services__bg-color section-pt-120 section-pb-120'>
            <div className='container'>
                <div className='row align-items-end align-items-xl-start'>
                    <div className='col-lg-6'>
                        <div className='section__title text-start mb-65'>
                            <span className='sub-title tg__animate-text'>powerful services</span>
                            <h3 className='title'>Revolutionizing Fashion, Delivered on Time</h3>
                        </div>
                        <div className='services__wrapper'>
                            {service_items.map((item, i) => (
                                <div
                                    key={item.id}
                                    className='services__item'
                                    onMouseOver={() => handleMouseOver(i)}
                                    onMouseOut={() => handleMouseOut(i)}
                                >
                                    <div className='services__icon'>
                                        <i className={item.icon}></i>
                                    </div>
                                    <div className='services__content'>
                                        <h4 className='title'>
                                            <Link href='/service-details'>{item.title}</Link>
                                        </h4>
                                        <p>{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className='col-lg-6'>
                        <div className='services__images'>
                            {service_images.map((s, i) => (
                                <div key={i} className={`services__images-item ${activeIndex === i ? 'active' : ''}`}>
                                    <Image
                                        src={s}
                                        alt='img'
                                        style={{
                                            width: '100%',
                                            height: '100%'
                                        }}
                                    />
                                    <Link href='/contact' className='services__link'>
                                        <i className='flaticon-next'></i>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ServicesArea
