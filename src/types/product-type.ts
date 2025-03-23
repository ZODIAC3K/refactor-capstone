import { StaticImageData } from 'next/image'

export interface IProduct {
    id: number
    img: any
    title: string
    price: number
    category: string
    description: string
    status: string
    rating?: number
    height: string
    width: string
}
