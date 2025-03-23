import React from 'react'

interface ErrorMsgProps {
    msg?: string
}

const ErrorMsg: React.FC<ErrorMsgProps> = ({ msg }) => {
    if (!msg) return null
    return <div style={{ color: 'red' }}>{msg}</div>
}

export default ErrorMsg
