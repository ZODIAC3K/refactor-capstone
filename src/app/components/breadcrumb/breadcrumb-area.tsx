import React from 'react'
import Image, { StaticImageData } from 'next/image'
import Link from 'next/link'
import default_bg from '@/assets/img/bg/breadcrumb_bg01.jpg'
import default_brd_img from '@/assets/img/others/breadcrumb_img01.png'
import SvgIconCom from '@/app/components/common/svg-icon-anim'
import shape from '@/assets/img/icons/shape.svg'

// props type
type IProps = {
    bg?: StaticImageData
    brd_img?: StaticImageData
    title: string
    subtitle: string
}
const BreadcrumbArea = ({ bg = default_bg, brd_img = default_brd_img, title, subtitle }: IProps) => {
    return (
        <section className='breadcrumb-area' style={{ backgroundImage: `url(${bg.src})` }}>
            <div className='container'>
                <div className='breadcrumb__wrapper'>
                    <div className='row'>
                        <div className='col-xl-6 col-lg-7'>
                            <div className='breadcrumb__content'>
                                <h2 className='title'>{title}</h2>
                                <nav aria-label='breadcrumb'>
                                    <ul className='breadcrumb'>
                                        {/* <li className="breadcrumb-item">
											<Link href="/">Home</Link>
										</li> */}
                                        <li className='breadcrumb-item active' aria-current='page'>
                                            {subtitle}
                                        </li>
                                    </ul>
                                </nav>
                                <div className='about__content-btns mx-auto my-4'>
                                    <Link href='/customize' className='tg-btn-3 tg-svg'>
                                        <SvgIconCom icon={shape} id='svg-6' />
                                        <span>Add Product</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className='col-xl-6 col-lg-5 position-relative d-none d-lg-block'>
                            <div className='breadcrumb__img'>
                                <Image src={brd_img} alt='img' style={{ height: 'auto', width: 'auto' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default BreadcrumbArea
