'use client'
import Link from 'next/link'
import React, { useState } from 'react'
import Image from 'next/image'
import Slider from 'react-slick'
import brand_1 from '@/assets/img/brand/brand01.png'
import brand_2 from '@/assets/img/brand/brand02.png'
import brand_3 from '@/assets/img/brand/brand03.png'
import brand_4 from '@/assets/img/brand/brand04.png'
import brand_5 from '@/assets/img/brand/brand05.png'
import brand_6 from '@/assets/img/brand/brand06.png'
import brand_7 from '@/assets/img/brand/brand07.png'

// slider setting
const slider_setting = {
    dots: false,
    infinite: true,
    speed: 500,
    autoplay: true,
    arrows: false,
    slidesToShow: 6,
    slidesToScroll: 2,
    responsive: [
        {
            breakpoint: 1200,
            settings: {
                slidesToShow: 5,
                slidesToScroll: 1,
                infinite: true
            }
        },
        {
            breakpoint: 992,
            settings: {
                slidesToShow: 4,
                slidesToScroll: 1
            }
        },
        {
            breakpoint: 767,
            settings: {
                slidesToShow: 4,
                slidesToScroll: 1,
                arrows: false
            }
        },
        {
            breakpoint: 575,
            settings: {
                slidesToShow: 3,
                slidesToScroll: 1,
                arrows: false
            }
        }
    ]
}

// brands
const brands = [brand_1, brand_2, brand_3, brand_4, brand_5, brand_6, brand_7, brand_2, brand_5]
interface BrandAreaProps {
    top_cls?: string
    hideTitle?: boolean
}
const BrandArea = ({ top_cls, hideTitle }: BrandAreaProps) => {
    return <section className={`brand-area ${top_cls}`} style={{ paddingBottom: '0rem' }}></section>
}

export default BrandArea
