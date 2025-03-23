const Circle = () => {
    return (
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 150 150' version='1.1'>
            <path id='textPath' d='M 35,50 a 65,65 0 1,1 0,1 z' transform='rotate(20)'></path>
            <text>
                <textPath href='#textPath'>AI Fashion Store</textPath>
            </text>
        </svg>
    )
}

export default Circle
