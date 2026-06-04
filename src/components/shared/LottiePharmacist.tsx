'use client'

import Lottie from 'lottie-react'
import pharmacistAnimation from '../../../public/lottie/pharmacist.json'

interface LottiePharmacistProps {
  loop?: boolean
  autoplay?: boolean
  className?: string
}

export default function LottiePharmacist({
  loop = true,
  autoplay = true,
  className,
}: LottiePharmacistProps) {
  return (
    <Lottie
      animationData={pharmacistAnimation}
      loop={loop}
      autoplay={autoplay}
      className={className}
    />
  )
}
