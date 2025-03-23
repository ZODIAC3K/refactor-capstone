import Link from 'next/link'
import Image from 'next/image'
// images
import cate_1 from '@/assets/img/products/product-03.png'
import cate_2 from '@/assets/img/products/product-5-2.png'
import cate_3 from '@/assets/img/products/product-5-3.png'
import cate_4 from '@/assets/img/products/product-5-4.png'
import cate_5 from '@/assets/img/products/product-5-5.png'
import cate_6 from '@/assets/img/products/product-5-6.png'

const categoryData = [
    {
        id: 1,
        imgSrc: cate_1,
        title: 'Full Sleeve T-shirt',
        columnClass: 'col-lg-6',
        imgStyle: { height: '250px', width: '250px' }
    },
    {
        id: 2,
        imgSrc: cate_2,
        title: 'Bath Robes',
        columnClass: 'col-xl-3 col-lg-6',
        imgStyle: { height: 'auto' }
    },
    {
        id: 3,
        imgSrc: cate_3,
        title: 'shorts',
        columnClass: 'col-xl-3 col-lg-6',
        imgStyle: { height: '250px', width: '250px' }
    },
    {
        id: 4,
        imgSrc: cate_4,
        title: 'Waist Coat',
        columnClass: 'col-xl-3 col-lg-6',
        imgStyle: { height: '250px', width: '250px' }
    },
    {
        id: 5,
        imgSrc: cate_5,
        title: 'workwear',
        columnClass: 'col-xl-3 col-lg-6',
        imgStyle: { height: '250px', width: '250px' }
    },
    {
        id: 6,
        imgSrc: cate_6,
        title: 'hoodies',
        columnClass: 'col-lg-6',
        imgStyle: { height: '270px', width: '270px' }
    }
]

export default function ProductCategory() {
    return (
        <section
            className='product-category__area section-pt-120 section-pb-120'
            data-background='/assets/img/bg/item-category-bg.png'
            style={{
                backgroundImage: `url(/assets/img/bg/item-category-bg.png)`
            }}
        >
            <div className='container custom-container4'>
                <div className='row gy-4'>
                    {categoryData.map((category) => (
                        <div key={category.id} className={category.columnClass}>
                            <div className='shop__category'>
                                <div className='shop__category-thumb'>
                                    <Image src={category.imgSrc} alt={category.title} style={category.imgStyle} />
                                </div>
                                <div className='shop__category-content'>
                                    <h4 className='title'>
                                        <Link href='/shop'>{category.title}</Link>
                                    </h4>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
